import { supabase } from './clients.js';

/**
 * 指定アカウントの会話一覧を、最新メッセージのプレビュー付きで取得する
 */
export async function fetchConversationsWithPreview(accountId) {
  const { data: conversations, error } = await supabase
    .from('dm_conversations')
    .select('id, conversation_id, is_group, title')
    .eq('account_id', accountId);

  if (error) throw error;
  if (!conversations || conversations.length === 0) return [];

  // 会話ごとに最新の1件を取得してプレビューにする
  const withPreview = await Promise.all(
    conversations.map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from('dm_messages')
        .select('text, created_at_x, sender_handle')
        .eq('conversation_id', conv.id)
        .order('created_at_x', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: participants } = await supabase
        .from('dm_participants')
        .select('participant_handle')
        .eq('conversation_id', conv.id);

      return {
        ...conv,
        lastMessageText: lastMsg?.text || '(メディアのみ、または本文なし)',
        lastMessageAt: lastMsg?.created_at_x || null,
        participantHandles: (participants || []).map((p) => p.participant_handle),
      };
    })
  );

  withPreview.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
  return withPreview;
}

const MESSAGE_PAGE_SIZE = 200;

/**
 * 特定の会話の直近N件を新しい順で取得し、表示用に古い→新しい順へ並べ替えて返す
 * beforeCursor を指定すると、それより古いメッセージをさらに取得できる(過去へのページング)
 */
export async function fetchConversationMessages(conversationUuid, beforeCursor = null) {
  let q = supabase
    .from('dm_messages')
    .select('id, text, created_at_x, sender_handle, dm_media(*)')
    .eq('conversation_id', conversationUuid)
    .order('created_at_x', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);

  if (beforeCursor) q = q.lt('created_at_x', beforeCursor);

  const { data, error } = await q;
  if (error) throw error;

  const messages = (data || []).reverse(); // 表示用に古い→新しい順に戻す
  const hasMore = (data || []).length === MESSAGE_PAGE_SIZE;
  const oldestCursor = messages.length > 0 ? messages[0].created_at_x : null;

  return { messages, hasMore, oldestCursor };
}
