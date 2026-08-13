import * as msal from 'https://esm.sh/@azure/msal-browser@3';
import { MSAL_CLIENT_ID, MSAL_AUTHORITY, GRAPH_SCOPES } from './msal-config.js';

const msalInstance = new msal.PublicClientApplication({
  auth: {
    clientId: MSAL_CLIENT_ID,
    authority: MSAL_AUTHORITY,
    redirectUri: window.location.origin + window.location.pathname,
  },
  cache: {
    cacheLocation: 'localStorage', // タブを閉じてもログイン状態を保持
  },
});

let initialized = false;
async function ensureInitialized() {
  if (initialized) return;
  await msalInstance.initialize();
  await msalInstance.handleRedirectPromise();
  initialized = true;
}

// ---------------- 認証 ----------------

export async function getOneDriveAccount() {
  await ensureInitialized();
  return msalInstance.getAllAccounts()[0] ?? null;
}

export async function signInOneDrive() {
  await ensureInitialized();
  const result = await msalInstance.loginPopup({ scopes: GRAPH_SCOPES });
  msalInstance.setActiveAccount(result.account);
  return result.account;
}

export async function signOutOneDrive() {
  await ensureInitialized();
  const account = msalInstance.getActiveAccount() ?? (await getOneDriveAccount());
  if (account) await msalInstance.logoutPopup({ account });
}

async function getAccessToken() {
  await ensureInitialized();
  const account = msalInstance.getActiveAccount() ?? (await getOneDriveAccount());
  if (!account) throw new Error('OneDriveにログインしていません');

  try {
    const result = await msalInstance.acquireTokenSilent({ scopes: GRAPH_SCOPES, account });
    return result.accessToken;
  } catch (e) {
    // サイレント更新に失敗したらポップアップで再認証
    const result = await msalInstance.acquireTokenPopup({ scopes: GRAPH_SCOPES, account });
    return result.accessToken;
  }
}

// ---------------- Graph API ----------------

const MAX_RETRY_ON_THROTTLE = 4;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function graphFetch(path, attempt = 0) {
  const token = await getAccessToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429 || res.status === 503) {
    if (attempt >= MAX_RETRY_ON_THROTTLE) {
      throw new Error(`Graph APIエラー: ${res.status} (リトライ上限に達しました)`);
    }
    // Retry-Afterヘッダー(秒)があればそれに従う。無ければ指数バックオフ+ジッター。
    const retryAfterHeader = res.headers.get('Retry-After');
    const waitMs = retryAfterHeader
      ? Number(retryAfterHeader) * 1000
      : 500 * 2 ** attempt + Math.random() * 300;
    await sleep(waitMs);
    return graphFetch(path, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`Graph APIエラー: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// 自分のOneDriveのdriveIdを取得(imagesテーブルのonedrive_drive_idに使う値)
let cachedDriveId = null;
export async function getMyDriveId() {
  if (cachedDriveId) return cachedDriveId;
  const data = await graphFetch('/me/drive?$select=id');
  cachedDriveId = data.id;
  return cachedDriveId;
}

// フォルダの中身一覧。folderId省略でルート直下。
// ($orderbyはfolderのような複合型プロパティに対応していないため、並び替えはクライアント側で行う)
export async function listFolder(folderId = null) {
  const path = folderId ? `/me/drive/items/${folderId}/children` : '/me/drive/root/children';
  const data = await graphFetch(`${path}?$select=id,name,folder,image,file&$top=200`);
  return data.value.sort((a, b) => {
    if (!!a.folder !== !!b.folder) return a.folder ? -1 : 1; // フォルダを先に
    return a.name.localeCompare(b.name, 'ja');
  });
}

// サムネイルURLのキャッシュ。同じ画像を何度も一覧に出す時にGraph APIを叩き直さないため。
const thumbnailCache = new Map(); // key: "driveId:itemId:size" -> { url, expiresAt }
const THUMBNAIL_CACHE_TTL_MS = 30 * 60 * 1000; // 30分

// サムネイルURLを取得(small/medium/large)。取得できない場合はnull。
export async function getThumbnailUrl(driveId, itemId, size = 'medium') {
  const cacheKey = `${driveId}:${itemId}:${size}`;
  const cached = thumbnailCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  try {
    const data = await graphFetch(`/drives/${driveId}/items/${itemId}/thumbnails`);
    const url = data.value?.[0]?.[size]?.url ?? null;
    if (url) thumbnailCache.set(cacheKey, { url, expiresAt: Date.now() + THUMBNAIL_CACHE_TTL_MS });
    return url;
  } catch {
    return null;
  }
}

// 閲覧用のフルサイズ画像の一時ダウンロードURLを取得(<img src>にそのまま使える)
export async function getDownloadUrl(driveId, itemId) {
  const data = await graphFetch(`/drives/${driveId}/items/${itemId}`);
  return data['@microsoft.graph.downloadUrl'] ?? null;
}
