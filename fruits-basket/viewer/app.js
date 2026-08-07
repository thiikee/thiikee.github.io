import { supabase, getOneDriveAccessToken, isOneDriveSignedIn, initMsal, TWEET_MEDIA_FOLDER } from './lib/clients.js';
import { decryptToBlob, blobToDataUrl } from './lib/crypto-browser.js';
import { fetchAccounts, fetchTags, searchTimeline } from './lib/search.js';
import { fetchConversationsWithPreview, fetchConversationMessages } from './lib/dm-conversations.js';

// ============================================
// 状態
// ============================================
let sessionPassword = null; // DMメディア復号用パスワード。メモリ上のみ、保存しない
let currentFilters = null;
let accountsCache = [];

const el = (id) => document.getElementById(id);

// ============================================
// 認証(Supabase Auth)
// ============================================
async function checkAuth() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function handleLogin(e) {
  e.preventDefault();
  const email = el('login-email').value;
  const password = el('login-password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    el('login-error').textContent = error.message;
    return;
  }
  await boot();
}

async function handleLogout() {
  await supabase.auth.signOut();
  location.reload();
}

// ============================================
// フィルタパネルの初期化
// ============================================
async function initFilterPanel() {
  accountsCache = await fetchAccounts();
  const accountList = el('account-list');
  accountList.innerHTML = accountsCache
    .map(
      (a) => `
      <label class="chip">
        <input type="checkbox" value="${a.id}" class="account-checkbox" checked>
        <span>@${a.handle}</span>
      </label>`
    )
    .join('');

  const tags = await fetchTags();
  const tagSelect = el('tag-select');
  tagSelect.innerHTML =
    '<option value="">タグで絞り込まない</option>' +
    tags.map((t) => `<option value="${t.id}">${t.namespace}:${t.value}</option>`).join('');
}

function readFiltersFromUI() {
  const kindTypes = new Set();
  if (el('filter-type-original').checked) kindTypes.add('original');
  if (el('filter-type-reply').checked) kindTypes.add('reply');
  if (el('filter-type-retweet').checked) kindTypes.add('retweet');

  const accountIds = Array.from(document.querySelectorAll('.account-checkbox:checked')).map(
    (cb) => cb.value
  );

  return {
    query: el('search-input').value.trim(),
    kindTypes,
    accountIds,
    tagId: el('tag-select').value || null,
    mediaOnly: el('filter-media-only').checked,
    dateFrom: el('filter-date-from').value || null,
    dateTo: el('filter-date-to').value || null,
    sortOrder: el('sort-order').value,
    beforeCursor: null,
  };
}

// ============================================
// タイムライン描画
// ============================================
function accountHandle(accountId) {
  const a = accountsCache.find((x) => x.id === accountId);
  return a ? `@${a.handle}` : '';
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderTweetCard(item) {
  const mediaHtml = item.media
    .map((m) => {
      if (!m.original_filename) {
        return `<div class="media-thumb media-placeholder">未アップロード</div>`;
      }
      return `<div class="media-thumb media-loading" data-tweet-id="${item.id}" data-filename="${escapeHtml(m.original_filename)}">読み込み中...</div>`;
    })
    .join('');

  const badgeInfo = {
    original: { label: 'TWEET', cls: 'badge-tweet' },
    reply: { label: '返信', cls: 'badge-reply' },
    retweet: { label: 'RT', cls: 'badge-retweet' },
  }[item.kind] || { label: 'TWEET', cls: 'badge-tweet' };

  return `
    <article class="card card-tweet">
      <div class="card-meta">
        <span class="badge ${badgeInfo.cls}">${badgeInfo.label}</span>
        <span class="handle">${accountHandle(item.account_id)}</span>
        <time>${formatDate(item.created_at)}</time>
      </div>
      <p class="card-text">${escapeHtml(item.text || '')}</p>
      ${mediaHtml ? `<div class="media-grid">${mediaHtml}</div>` : ''}
      <div class="card-stats">♡ ${item.favorite_count ?? 0} · ⟲ ${item.retweet_count ?? 0}</div>
    </article>`;
}

// ============================================
// ツイートメディアの取得(暗号化なし。パスから直接Graph APIで取得)
// ============================================
async function loadTweetMedia(container) {
  const targets = Array.from(container.querySelectorAll('.media-loading'));
  if (targets.length === 0) return;

  if (!isOneDriveSignedIn()) {
    // ユーザー操作を伴わない自動ポップアップはブラウザにブロックされるため、
    // ここでは案内表示のみ行い、実際のサインインは「OneDriveに接続」ボタンから行う
    targets.forEach((el) => {
      el.textContent = '右上の「OneDriveに接続」を押してください';
      el.classList.add('media-placeholder');
    });
    return;
  }

  let accessToken;
  try {
    accessToken = await getOneDriveAccessToken();
  } catch (err) {
    console.error('OneDrive認証に失敗しました', err);
    targets.forEach((el) => {
      el.textContent = '認証エラー';
      el.classList.add('media-placeholder');
    });
    return;
  }

  await fetchAndReplaceMediaTargets(targets, accessToken);
}

async function fetchAndReplaceMediaTargets(targets, accessToken) {
  for (const target of targets) {
    const tweetId = target.dataset.tweetId;
    const filename = target.dataset.filename;
    const path = `${TWEET_MEDIA_FOLDER}/${tweetId}-${filename}`;

    try {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURI(path)}:/content`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error(`取得失敗 (${res.status})`);

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const img = document.createElement('img');
      img.className = 'media-thumb';
      img.src = objectUrl;
      img.loading = 'lazy';
      target.replaceWith(img);
    } catch (err) {
      console.error(`メディア取得失敗 (${path})`, err);
      target.textContent = '取得失敗';
      target.classList.add('media-placeholder');
    }
  }
}

async function handleConnectOneDrive() {
  const btn = el('onedrive-connect');
  btn.textContent = '接続中...';
  try {
    await getOneDriveAccessToken(); // ここはクリックから直接呼ばれるのでポップアップが許可される
    btn.textContent = '✓ OneDrive接続済み';
    btn.classList.add('connected');
    btn.disabled = true;
    // 既に画面上にある「読み込み待ち」のメディアを再取得
    const pending = Array.from(document.querySelectorAll('.media-loading, .media-placeholder'));
    if (pending.length) {
      const accessToken = await getOneDriveAccessToken();
      await fetchAndReplaceMediaTargets(
        pending.filter((el) => el.dataset.tweetId), // ツイートメディアのプレースホルダーのみ対象
        accessToken
      );
    }
  } catch (err) {
    console.error(err);
    btn.textContent = '接続に失敗しました(再試行)';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderTimeline(items, { append } = { append: false }) {
  const container = el('timeline');
  const html = items.map((item) => renderTweetCard(item)).join('');

  if (append) {
    container.insertAdjacentHTML('beforeend', html);
  } else {
    container.innerHTML = html || '<p class="empty-state">該当する投稿が見つかりませんでした。</p>';
  }

  loadTweetMedia(container);
}

// ============================================
// DMメディアの復号
// ============================================
async function ensureSessionPassword() {
  if (sessionPassword) return sessionPassword;
  const input = prompt('DMメディアを復号するためのパスワードを入力してください');
  if (!input) throw new Error('パスワードが入力されませんでした');
  sessionPassword = input;
  return sessionPassword;
}

async function decryptAndShowMedia(button) {
  const onedriveItemId = button.dataset.onedriveId;
  const mime = button.dataset.mime || 'image/jpeg';

  button.textContent = '復号中...';
  button.disabled = true;

  try {
    const password = await ensureSessionPassword();
    const accessToken = await getOneDriveAccessToken();

    const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${onedriveItemId}/content`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`OneDriveダウンロード失敗 (${res.status})`);

    const encryptedBuffer = await res.arrayBuffer();
    const blob = await decryptToBlob(encryptedBuffer, password, mime);
    const dataUrl = await blobToDataUrl(blob);

    const img = document.createElement('img');
    img.className = 'media-thumb';
    img.src = dataUrl;
    button.replaceWith(img);
  } catch (err) {
    console.error(err);
    button.textContent = '復号失敗(タップして再試行)';
    button.disabled = false;
    // パスワードが間違っていた可能性があるのでリセットして次回また聞き直す
    sessionPassword = null;
  }
}

function attachMediaDecryptHandlers(root = document) {
  root.querySelectorAll('.media-locked').forEach((btn) => {
    if (btn.dataset.bound) return; // 二重登録防止
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => decryptAndShowMedia(btn));
  });
}

// ============================================
// 検索実行
// ============================================
async function runSearch() {
  currentFilters = readFiltersFromUI();
  el('timeline').innerHTML = '<p class="empty-state">検索中...</p>';
  const { items, nextCursor, hasMore } = await searchTimeline(currentFilters);
  renderTimeline(items, { append: false });
  el('load-more').style.display = hasMore ? 'block' : 'none';
  el('load-more').dataset.cursor = nextCursor || '';
}

async function loadMore() {
  const cursor = el('load-more').dataset.cursor;
  if (!cursor) return;
  const filters = { ...currentFilters, beforeCursor: cursor };
  const { items, nextCursor, hasMore } = await searchTimeline(filters);
  renderTimeline(items, { append: true });
  el('load-more').style.display = hasMore ? 'block' : 'none';
  el('load-more').dataset.cursor = nextCursor || '';
}

// ============================================
// タブ切り替え
// ============================================
function switchView(view) {
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  el('timeline-view').style.display = view === 'timeline' ? 'block' : 'none';
  el('dm-view').style.display = view === 'dm' ? 'flex' : 'none';
  document.querySelector('.filter-panel').style.display = view === 'timeline' ? 'block' : 'none';

  if (view === 'dm' && !dmInitialized) {
    initDmView();
  }
}

// ============================================
// DM会話別ビュー
// ============================================
let dmInitialized = false;
let activeConversationAccount = null;

async function initDmView() {
  dmInitialized = true;
  const select = el('dm-account-select');
  select.innerHTML = accountsCache.map((a) => `<option value="${a.id}">@${a.handle}</option>`).join('');
  select.addEventListener('change', () => loadConversationList(select.value));

  if (accountsCache.length > 0) {
    await loadConversationList(accountsCache[0].id);
  }
}

async function loadConversationList(accountId) {
  activeConversationAccount = accountsCache.find((a) => a.id === accountId);
  const listEl = el('conversation-list');
  listEl.innerHTML = '<p class="empty-state">読み込み中...</p>';

  const conversations = await fetchConversationsWithPreview(accountId);

  if (conversations.length === 0) {
    listEl.innerHTML = '<p class="empty-state">会話がありません。</p>';
    return;
  }

  listEl.innerHTML = conversations
    .map((c) => {
      const title = c.is_group
        ? c.title || 'グループDM'
        : c.participantHandles.filter((h) => h !== activeConversationAccount?.x_account_id).join(', ') || '(相手不明)';
      return `
        <button class="conversation-item" data-conversation-id="${c.id}">
          <div class="conversation-item-title">${escapeHtml(title)}</div>
          <div class="conversation-item-preview">${escapeHtml(c.lastMessageText)}</div>
          <div class="conversation-item-time">${formatDate(c.lastMessageAt)}</div>
        </button>`;
    })
    .join('');

  listEl.querySelectorAll('.conversation-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      listEl.querySelectorAll('.conversation-item').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      openConversation(btn.dataset.conversationId);
    });
  });
}

let currentConversationId = null;
let currentOldestCursor = null;

function renderBubble(m, myAccountId) {
  const isMine = myAccountId && m.sender_handle === myAccountId;
  const mediaHtml = (m.dm_media || [])
    .map(
      (media) => `
      <button class="media-thumb media-locked" data-media-id="${media.id}" data-onedrive-id="${media.onedrive_item_id}" data-mime="${media.original_mime_type || ''}">
        🔒
      </button>`
    )
    .join('');

  return `
    <div class="bubble-row ${isMine ? 'mine' : 'theirs'}">
      <div>
        <div class="bubble">${m.text ? escapeHtml(m.text) : ''}${mediaHtml ? `<div class="bubble-media">${mediaHtml}</div>` : ''}</div>
        <div class="bubble-time">${formatDate(m.created_at_x)}</div>
      </div>
    </div>`;
}

async function openConversation(conversationUuid) {
  currentConversationId = conversationUuid;
  const threadEl = el('conversation-thread');
  threadEl.innerHTML = '<p class="empty-state">読み込み中...</p>';

  const { messages, hasMore, oldestCursor } = await fetchConversationMessages(conversationUuid);
  currentOldestCursor = oldestCursor;
  const myAccountId = activeConversationAccount?.x_account_id;

  const loadOlderHtml = hasMore
    ? '<button id="load-older" class="btn-ghost btn-block">さらに過去を読み込む</button>'
    : '';

  const html = messages.map((m) => renderBubble(m, myAccountId)).join('');

  threadEl.innerHTML = loadOlderHtml + (html || '<p class="empty-state">メッセージがありません。</p>');
  threadEl.scrollTop = threadEl.scrollHeight;
  attachMediaDecryptHandlers(threadEl);

  const loadOlderBtn = el('load-older');
  if (loadOlderBtn) loadOlderBtn.addEventListener('click', loadOlderMessages);
}

async function loadOlderMessages() {
  if (!currentConversationId || !currentOldestCursor) return;
  const threadEl = el('conversation-thread');
  const btn = el('load-older');
  if (btn) btn.textContent = '読み込み中...';

  const prevScrollHeight = threadEl.scrollHeight;

  const { messages, hasMore, oldestCursor } = await fetchConversationMessages(
    currentConversationId,
    currentOldestCursor
  );
  currentOldestCursor = oldestCursor;

  const myAccountId = activeConversationAccount?.x_account_id;
  const html = messages.map((m) => renderBubble(m, myAccountId)).join('');

  if (btn) {
    if (hasMore) {
      btn.textContent = 'さらに過去を読み込む';
    } else {
      btn.remove();
    }
  }

  const loadOlderBtn2 = el('load-older');
  if (loadOlderBtn2) {
    loadOlderBtn2.insertAdjacentHTML('afterend', html);
  } else {
    threadEl.insertAdjacentHTML('afterbegin', html);
  }

  // 読み込み後もスクロール位置を保つ(一番上に飛ばないように)
  threadEl.scrollTop = threadEl.scrollHeight - prevScrollHeight;

  attachMediaDecryptHandlers(threadEl);
}

// ============================================
// 起動
// ============================================
async function boot() {
  const session = await checkAuth();
  if (!session) {
    el('login-view').style.display = 'block';
    el('app-view').style.display = 'none';
    return;
  }

  el('login-view').style.display = 'none';
  el('app-view').style.display = 'block';

  await initMsal();
  if (isOneDriveSignedIn()) {
    const btn = el('onedrive-connect');
    btn.textContent = '✓ OneDrive接続済み';
    btn.classList.add('connected');
    btn.disabled = true;
  }

  await initFilterPanel();
  await runSearch();
}

document.addEventListener('DOMContentLoaded', () => {
  el('login-form').addEventListener('submit', handleLogin);
  el('logout-button').addEventListener('click', handleLogout);
  el('onedrive-connect').addEventListener('click', handleConnectOneDrive);
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  el('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch();
  });
  el('load-more').addEventListener('click', loadMore);

  boot();
});
