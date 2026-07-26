-- ============================================
-- 画像/投稿管理 スキーマ (Supabase / PostgreSQL)
-- ============================================

create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";

-- 投稿の大分類
create type post_category as enum (
  'photo',
  'illustration',
  'video',
  'magazine',
  'movie'
);

-- タグの名前空間(内容タグ / 人物タグ / 作者タグ を明確に分離)
create type tag_namespace as enum ('content', 'person', 'creator');

-- 制作日の精度(過去の日付なので厳密な日付が分からないことが多い)
create type date_precision as enum ('day', 'month', 'year', 'unknown');

-- ---------- posts ----------
create table posts (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  category        post_category not null,
  is_illustration boolean not null default false, -- 実写/イラストの区別(categoryとは独立の軸)
  is_liked        boolean not null default false, -- 「いいね」フラグ

  production_date           date,                          -- その画像が制作された過去の日付
  production_date_precision date_precision not null default 'unknown',

  usage_count     integer not null default 0,   -- 素材として使った回数

  created_at      timestamptz not null default now(),  -- レコード作成日時
  updated_at      timestamptz not null default now(),  -- レコード更新日時
  deleted_at      timestamptz,                          -- NULL=有効, 値あり=論理削除

  owner_id        uuid not null default auth.uid() references auth.users(id)
);

create index idx_posts_title_trgm on posts using gin (title gin_trgm_ops);
create index idx_posts_deleted_at on posts (deleted_at);
create index idx_posts_category on posts (category);
create index idx_posts_owner on posts (owner_id);

-- ---------- images (1投稿に複数画像、シリーズものに対応) ----------
create table images (
  id                uuid primary key default uuid_generate_v4(),
  post_id           uuid not null references posts(id) on delete cascade,

  onedrive_drive_id text not null,  -- Graph API の driveId
  onedrive_item_id  text not null,  -- Graph API の driveItem id

  sort_order        integer not null default 0,
  width             integer,
  height            integer,
  mime_type         text,

  created_at        timestamptz not null default now(),

  unique (onedrive_drive_id, onedrive_item_id)
);

create index idx_images_post_id on images (post_id);

-- ---------- posts.cover_image_id (複数画像があるときのカバー画像) ----------
-- images テーブルがこの時点で存在するので、ここで外部キーを追加する
alter table posts
  add column cover_image_id uuid references images(id) on delete set null;

create index idx_posts_cover_image on posts (cover_image_id);
create index idx_posts_is_liked on posts (is_liked) where is_liked;

-- ---------- tags (内容/人物/作者の3系統を1テーブルで管理) ----------
create table tags (
  id         uuid primary key default uuid_generate_v4(),
  namespace  tag_namespace not null,
  name       text not null,
  unique (namespace, name)
);

create index idx_tags_namespace_name on tags (namespace, name);

-- ---------- post_tags (多対多の中間テーブル) ----------
create table post_tags (
  post_id  uuid not null references posts(id) on delete cascade,
  tag_id   uuid not null references tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

-- ---------- updated_at の自動更新 ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_posts_updated_at
before update on posts
for each row execute function set_updated_at();

-- ---------- 論理削除されていない投稿だけを見るビュー ----------
create view active_posts as
select * from posts where deleted_at is null;

-- ---------- 検索用ヘルパービュー: タグを名前空間別に集約 ----------
create view post_tags_expanded as
select
  p.id as post_id,
  array_agg(t.name) filter (where t.namespace = 'content') as content_tags,
  array_agg(t.name) filter (where t.namespace = 'person')  as person_tags,
  array_agg(t.name) filter (where t.namespace = 'creator') as creator_tags
from posts p
left join post_tags pt on pt.post_id = p.id
left join tags t on t.id = pt.tag_id
group by p.id;

-- ---------- Row Level Security ----------
alter table posts enable row level security;
alter table images enable row level security;
alter table tags enable row level security;
alter table post_tags enable row level security;

-- 自分の投稿だけ読み書き可能(1ユーザー運用の前提。owner_idで分離しているので
-- 将来 "他人にも読ませたい" となった場合は select 用ポリシーを追加するだけでよい)
create policy "own posts" on posts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own images" on images
  for all using (
    exists (select 1 from posts p where p.id = images.post_id and p.owner_id = auth.uid())
  );

create policy "read tags" on tags for select using (true);
create policy "write tags" on tags for insert with check (auth.uid() is not null);

create policy "own post_tags" on post_tags
  for all using (
    exists (select 1 from posts p where p.id = post_tags.post_id and p.owner_id = auth.uid())
  );

-- ---------- 使用回数のインクリメント用関数(素材として使ったら呼ぶ) ----------
create or replace function increment_usage_count(target_post_id uuid)
returns void as $$
begin
  update posts set usage_count = usage_count + 1 where id = target_post_id;
end;
$$ language plpgsql security definer;

-- ---------- 検索用RPC ----------
-- content_tags_all / person_tags_all / creator_tags_all は「すべて含む(AND)」条件。
-- 空配列を渡せばそのタグ種別は絞り込み対象外になる。
drop function if exists search_posts;

create or replace function search_posts(
  title_query       text default null,
  p_category        post_category default null,
  p_is_illustration boolean default null,
  p_is_liked        boolean default null,
  content_tags_all  text[] default '{}',
  person_tags_all   text[] default '{}',
  creator_tags_all  text[] default '{}',
  include_deleted   boolean default false,
  sort_by           text default 'updated_at',   -- 'updated_at' | 'production_date' | 'usage_count'
  sort_asc          boolean default false,
  result_limit      integer default 50,
  result_offset     integer default 0
)
returns table (
  id                         uuid,
  title                      text,
  category                   post_category,
  is_illustration            boolean,
  is_liked                   boolean,
  production_date            date,
  production_date_precision date_precision,
  usage_count                integer,
  created_at                 timestamptz,
  updated_at                 timestamptz,
  deleted_at                 timestamptz,
  cover_image_id             uuid,
  cover_drive_id             text,
  cover_item_id              text,
  content_tags               text[],
  person_tags                text[],
  creator_tags               text[]
)
language sql
stable
security invoker
as $$
  select
    p.id, p.title, p.category, p.is_illustration, p.is_liked,
    p.production_date, p.production_date_precision, p.usage_count,
    p.created_at, p.updated_at, p.deleted_at, p.cover_image_id,
    ci.onedrive_drive_id, ci.onedrive_item_id,
    pte.content_tags, pte.person_tags, pte.creator_tags
  from posts p
  left join post_tags_expanded pte on pte.post_id = p.id
  left join images ci on ci.id = p.cover_image_id
  where p.owner_id = auth.uid()
    and (include_deleted or p.deleted_at is null)
    and (title_query is null or title_query = '' or p.title ilike '%' || title_query || '%')
    and (p_category is null or p.category = p_category)
    and (p_is_illustration is null or p.is_illustration = p_is_illustration)
    and (p_is_liked is null or p.is_liked = p_is_liked)
    and (content_tags_all = '{}' or coalesce(pte.content_tags, '{}') @> content_tags_all)
    and (person_tags_all  = '{}' or coalesce(pte.person_tags,  '{}') @> person_tags_all)
    and (creator_tags_all = '{}' or coalesce(pte.creator_tags, '{}') @> creator_tags_all)
  order by
    case when sort_by = 'updated_at'       and sort_asc     then p.updated_at end asc,
    case when sort_by = 'updated_at'       and not sort_asc then p.updated_at end desc,
    case when sort_by = 'production_date'  and sort_asc     then p.production_date end asc,
    case when sort_by = 'production_date'  and not sort_asc then p.production_date end desc,
    case when sort_by = 'usage_count'      and sort_asc     then p.usage_count end asc,
    case when sort_by = 'usage_count'      and not sort_asc then p.usage_count end desc
  limit result_limit offset result_offset;
$$;
