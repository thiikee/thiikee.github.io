// Supabaseプロジェクトの設定
// publishable key (sb_publishable_xxx) は「公開されて困る秘密」ではありません
// (RLSでowner_idごとに制御されるため)。GitHub Pagesにそのままコミットして問題ありません。
// 取得場所: Supabaseダッシュボード > Settings > API Keys > Publishable and secret API keys タブ
// ※ secret key (sb_secret_xxx) はRLSを全てバイパスするので、絶対にここに書かないこと。
export const SUPABASE_URL = 'https://uuzhrrlsbvcrpbexonwl.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_XQzb2xjR388tbJnWbW_WYQ_OP6mQt2i';
