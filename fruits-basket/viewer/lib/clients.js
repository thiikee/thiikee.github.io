// ============================================
// Supabase & MSAL(OneDrive)初期化
// ここに実際のプロジェクト値を埋めてください
// ============================================

export const SUPABASE_URL = 'https://rpcoodhoszrugmfhqnuu.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zMNfZlQOHu_ku6jk2Hot8w_CXUw-Eum'; // publishable(旧anon)キー。RLSが効くのでブラウザに置いてOK

export const MSAL_CLIENT_ID = 'bf36c6fd-b915-4037-a1f3-8c05cc122f62'; // 画像アプリと同じAzure ADアプリのクライアントID
export const MSAL_REDIRECT_URI = window.location.origin + window.location.pathname;
export const TWEET_MEDIA_FOLDER = '/Apps/TweetArchive/media'; // parse-tweets.js と揃えること

// ---- Supabase ----
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---- MSAL (OneDriveアクセス用) ----
// v3以降はCDN配信が廃止されているため、esm.sh経由でESモジュールとしてimportする
import { PublicClientApplication } from 'https://esm.sh/@azure/msal-browser@3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let msalInstance = null;
let cachedAccount = null;

export async function initMsal() {
  if (msalInstance) return msalInstance;
  msalInstance = new PublicClientApplication({
    auth: {
      clientId: MSAL_CLIENT_ID,
      authority: 'https://login.microsoftonline.com/consumers',
      redirectUri: MSAL_REDIRECT_URI,
    },
    cache: {
      cacheLocation: 'sessionStorage', // localStorageではなくsessionStorage(タブを閉じると消える)
    },
  });
  await msalInstance.initialize();

  // リダイレクト後の戻りを処理
  const redirectResult = await msalInstance.handleRedirectPromise();
  if (redirectResult?.account) {
    cachedAccount = redirectResult.account;
  } else {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) cachedAccount = accounts[0];
  }

  return msalInstance;
}

/**
 * OneDrive用アクセストークンを取得する
 * 既にサインイン済みなら裏側で自動更新(silent)、初回はポップアップでサインインを求める
 */
export async function getOneDriveAccessToken() {
  await initMsal();
  const scopes = ['Files.ReadWrite'];

  if (cachedAccount) {
    try {
      const result = await msalInstance.acquireTokenSilent({ scopes, account: cachedAccount });
      return result.accessToken;
    } catch (err) {
      console.warn('サイレント取得に失敗、ポップアップにフォールバックします', err);
    }
  }

  const result = await msalInstance.loginPopup({ scopes });
  cachedAccount = result.account;
  return result.accessToken;
}

export function isOneDriveSignedIn() {
  return !!cachedAccount;
}
