// Azure AD (Entra ID) アプリ登録の設定
//
// 事前準備:
// 1. https://portal.azure.com > Microsoft Entra ID > アプリの登録 > 新規登録
// 2. サポートされているアカウントの種類: 「個人用Microsoftアカウントのみ」
//    (会社のOneDriveも使う場合は「任意の組織のディレクトリ...および個人用Microsoftアカウント」)
// 3. リダイレクトURI: プラットフォームで「シングルページアプリケーション(SPA)」を選び、
//    実際に使うURL(例: https://<user>.github.io/<repo>/webapp/index.html)を登録。
//    ローカルテスト用に http://localhost:8080/ 等も追加しておくと便利。
// 4. 「APIのアクセス許可」で Microsoft Graph > 委任されたアクセス許可 > Files.Read を追加
// 5. 概要ページの「アプリケーション(クライアント)ID」を下にコピー

export const MSAL_CLIENT_ID = 'bf36c6fd-b915-4037-a1f3-8c05cc122f62';

// 個人用Microsoftアカウントのみ使う場合はこのままでよい。
// 会社アカウントも許可するアプリ登録にした場合は 'https://login.microsoftonline.com/common' に変更する。
export const MSAL_AUTHORITY = 'https://login.microsoftonline.com/consumers';

export const GRAPH_SCOPES = ['Files.Read'];
