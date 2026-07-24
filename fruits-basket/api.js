import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export const CATEGORIES = ['photo', 'illustration', 'video', 'magazine', 'movie'];
export const TAG_NAMESPACES = ['content', 'person', 'creator'];

// ---------------- 認証 ----------------

// メールアドレス宛にログイン用のマジックリンクを送る(パスワード不要)
export async function signInWithMagicLink(email) {
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// session(ログイン中はuser情報あり、未ログインはnull)が変わるたびcallbackを呼ぶ
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

// ---------------- タグ ----------------

// 指定した名前空間+名前のタグIDを取得。無ければ作成する。
export async function getOrCreateTag(namespace, name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing, error: selectErr } = await supabase
    .from('tags')
    .select('id')
    .eq('namespace', namespace)
    .eq('name', trimmed)
    .maybeSingle();
  if (selectErr) throw selectErr;
  if (existing) return existing.id;

  const { data: created, error: insertErr } = await supabase
    .from('tags')
    .insert({ namespace, name: trimmed })
    .select('id')
    .single();
  if (insertErr) throw insertErr;
  return created.id;
}

// タグ名の前方一致/部分一致検索(登録フォームのサジェスト用)
export async function searchTags(namespace, query, limit = 20) {
  let q = supabase.from('tags').select('id, name').eq('namespace', namespace).order('name');
  if (query) q = q.ilike('name', `%${query}%`);
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  return data;
}

async function attachTags(postId, tagsByNamespace) {
  const entries = [];
  for (const namespace of TAG_NAMESPACES) {
    for (const name of tagsByNamespace[namespace] ?? []) {
      const tagId = await getOrCreateTag(namespace, name);
      if (tagId) entries.push({ post_id: postId, tag_id: tagId });
    }
  }
  if (entries.length > 0) {
    const { error } = await supabase.from('post_tags').insert(entries);
    if (error) throw error;
  }
}

export async function replaceTags(postId, tagsByNamespace) {
  const { error: delErr } = await supabase.from('post_tags').delete().eq('post_id', postId);
  if (delErr) throw delErr;
  await attachTags(postId, tagsByNamespace);
}

// ---------------- 投稿の作成 ----------------

// images: [{ driveId, itemId, sortOrder, width, height, mimeType, isCover }]
// tags:   { content: string[], person: string[], creator: string[] }
export async function createPost({
  title,
  category,
  isIllustration,
  isLiked = false,
  productionDate = null,
  productionDatePrecision = 'unknown',
  images = [],
  tags = { content: [], person: [], creator: [] },
}) {
  const { data: post, error: postErr } = await supabase
    .from('posts')
    .insert({
      title,
      category,
      is_illustration: isIllustration,
      is_liked: isLiked,
      production_date: productionDate,
      production_date_precision: productionDatePrecision,
    })
    .select('id')
    .single();
  if (postErr) throw postErr;

  const postId = post.id;

  if (images.length > 0) {
    const rows = images.map((img, i) => ({
      post_id: postId,
      onedrive_drive_id: img.driveId,
      onedrive_item_id: img.itemId,
      sort_order: img.sortOrder ?? i,
      width: img.width ?? null,
      height: img.height ?? null,
      mime_type: img.mimeType ?? null,
    }));
    const { data: insertedImages, error: imgErr } = await supabase
      .from('images')
      .insert(rows)
      .select('id');
    if (imgErr) throw imgErr;

    const coverIdx = images.findIndex((img) => img.isCover);
    if (coverIdx >= 0 && insertedImages[coverIdx]) {
      await setCoverImage(postId, insertedImages[coverIdx].id);
    }
  }

  await attachTags(postId, tags);

  return postId;
}

// ---------------- 投稿の更新 ----------------

export async function updatePost(postId, fields) {
  const patch = {};
  if ('title' in fields) patch.title = fields.title;
  if ('category' in fields) patch.category = fields.category;
  if ('isIllustration' in fields) patch.is_illustration = fields.isIllustration;
  if ('isLiked' in fields) patch.is_liked = fields.isLiked;
  if ('productionDate' in fields) patch.production_date = fields.productionDate;
  if ('productionDatePrecision' in fields) patch.production_date_precision = fields.productionDatePrecision;

  const { error } = await supabase.from('posts').update(patch).eq('id', postId);
  if (error) throw error;
}

export async function setCoverImage(postId, imageId) {
  const { error } = await supabase.from('posts').update({ cover_image_id: imageId }).eq('id', postId);
  if (error) throw error;
}

export async function addImages(postId, images) {
  const rows = images.map((img, i) => ({
    post_id: postId,
    onedrive_drive_id: img.driveId,
    onedrive_item_id: img.itemId,
    sort_order: img.sortOrder ?? i,
  }));
  const { error } = await supabase.from('images').insert(rows);
  if (error) throw error;
}

export async function listImages(postId) {
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('post_id', postId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

// ---------------- 論理削除 ----------------

export async function softDeletePost(postId) {
  const { error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId);
  if (error) throw error;
}

export async function restorePost(postId) {
  const { error } = await supabase.from('posts').update({ deleted_at: null }).eq('id', postId);
  if (error) throw error;
}

// ---------------- 使用回数 ----------------

export async function incrementUsageCount(postId) {
  const { error } = await supabase.rpc('increment_usage_count', { target_post_id: postId });
  if (error) throw error;
}

// ---------------- 検索 ----------------

// filters: {
//   titleQuery, category, isIllustration, isLiked, includeDeleted,
//   contentTags: string[], personTags: string[], creatorTags: string[],
//   sortBy, sortAsc, limit, offset
// }
export async function searchPosts(filters = {}) {
  const { data, error } = await supabase.rpc('search_posts', {
    title_query: filters.titleQuery || null,
    p_category: filters.category || null,
    p_is_illustration: filters.isIllustration ?? null,
    p_is_liked: filters.isLiked ?? null,
    content_tags_all: filters.contentTags ?? [],
    person_tags_all: filters.personTags ?? [],
    creator_tags_all: filters.creatorTags ?? [],
    include_deleted: filters.includeDeleted ?? false,
    sort_by: filters.sortBy ?? 'updated_at',
    sort_asc: filters.sortAsc ?? false,
    result_limit: filters.limit ?? 50,
    result_offset: filters.offset ?? 0,
  });
  if (error) throw error;
  return data;
}
