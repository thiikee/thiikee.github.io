import { supabase } from './clients.js';

const PAGE_SIZE = 30;

export async function fetchAccounts() {
  const { data, error } = await supabase.from('accounts').select('id, handle, display_name, x_account_id');
  if (error) throw error;
  return data || [];
}

export async function fetchTags() {
  const { data, error } = await supabase.from('tags').select('id, namespace, value');
  if (error) throw error;
  return data || [];
}

/**
 * ツイート+DMを横断検索し、created_at_x降順でマージして返す
 *
 * @param {object} filters
 *   query: string (本文の部分一致)
 *   types: Set('tweet' | 'dm')
 *   accountIds: string[] (空配列 = 全アカウント)
 *   tagId: string | null (指定時はツイートのみに絞られる)
 *   mediaOnly: boolean
 *   dateFrom, dateTo: 'YYYY-MM-DD' | null
 *   beforeCursor: ISO string | null (このタイムスタンプより古いものを取得。ページング用)
 */
/**
 * ツイートを検索する(タイムラインはツイート専用。DMは別タブの会話別ビューへ)
 *
 * @param {object} filters
 *   query: string (本文の部分一致)
 *   replyTypes: Set('original' | 'reply')  -- 通常ツイート/返信の絞り込み
 *   accountIds: string[] (空配列 = 全アカウント)
 *   tagId: string | null
 *   mediaOnly: boolean
 *   dateFrom, dateTo: 'YYYY-MM-DD' | null
 *   sortOrder: 'asc' | 'desc'
 *   beforeCursor: ISO string | null (ページング用。sortOrderに応じて「より古い/より新しい」を意味する)
 */
export async function searchTimeline(filters) {
  return searchTweets(filters);
}

function classifyKind(t) {
  if ((t.full_text || '').startsWith('RT @')) return 'retweet';
  if (t.in_reply_to_status_id) return 'reply';
  return 'original';
}

async function searchTweets(filters) {
  const wantOriginal = filters.kindTypes.has('original');
  const wantReply = filters.kindTypes.has('reply');
  const wantRetweet = filters.kindTypes.has('retweet');
  if (!wantOriginal && !wantReply && !wantRetweet) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  let tweetIdsFromTag = null;
  if (filters.tagId) {
    const { data, error } = await supabase
      .from('tweet_tags')
      .select('tweet_id')
      .eq('tag_id', filters.tagId);
    if (error) throw error;
    tweetIdsFromTag = (data || []).map((r) => r.tweet_id);
    if (tweetIdsFromTag.length === 0) return { items: [], nextCursor: null, hasMore: false };
  }

  const ascending = filters.sortOrder === 'asc';
  const BATCH = 100;
  const collected = [];
  let cursor = filters.beforeCursor;
  let lastProcessedCursor = cursor;
  let exhausted = false;
  let safety = 0;

  while (collected.length < PAGE_SIZE && safety < 30) {
    safety++;

    let q = supabase
      .from('tweets')
      .select('id, full_text, created_at_x, account_id, favorite_count, retweet_count, in_reply_to_status_id, media(*)')
      .order('created_at_x', { ascending })
      .limit(BATCH);

    if (filters.query) q = q.ilike('full_text', `%${filters.query}%`);
    if (filters.accountIds.length) q = q.in('account_id', filters.accountIds);
    if (filters.dateFrom) q = q.gte('created_at_x', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at_x', filters.dateTo);
    if (tweetIdsFromTag) q = q.in('id', tweetIdsFromTag);
    if (cursor) q = ascending ? q.gt('created_at_x', cursor) : q.lt('created_at_x', cursor);

    const { data, error } = await q;
    if (error) throw error;

    if (!data || data.length === 0) {
      exhausted = true;
      break;
    }

    for (const t of data) {
      lastProcessedCursor = t.created_at_x;
      const kind = classifyKind(t);
      const wanted =
        (kind === 'retweet' && wantRetweet) ||
        (kind === 'reply' && wantReply) ||
        (kind === 'original' && wantOriginal);

      if (wanted) {
        if (filters.mediaOnly && (!t.media || t.media.length === 0)) continue;
        collected.push({
          type: 'tweet',
          id: t.id,
          text: t.full_text,
          created_at: t.created_at_x,
          account_id: t.account_id,
          favorite_count: t.favorite_count,
          retweet_count: t.retweet_count,
          kind,
          media: t.media || [],
        });
        if (collected.length === PAGE_SIZE) break;
      }
    }

    cursor = lastProcessedCursor;
    if (data.length < BATCH) {
      exhausted = true;
      break;
    }
  }

  const hasMore = !exhausted && collected.length === PAGE_SIZE;
  const nextCursor = collected.length > 0 ? lastProcessedCursor : null;

  return { items: collected, nextCursor, hasMore };
}
