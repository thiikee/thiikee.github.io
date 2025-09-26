// config/config.js
// 設定ファイル - 実際の値に置き換えてください

const CONFIG = {
    // Firebase設定
    firebase: {
        apiKey: "AIzaSyCRFQdEjgM97Yx3z7T94lK-dQ3F5NiAE1c",
        authDomain: "my-fruits-basket.firebaseapp.com",
        projectId: "my-fruits-basket",
        //storageBucket: "your-project.appspot.com",
        //messagingSenderId: "123456789",
        //appId: "your-app-id"
},

    // Microsoft OneDrive / Azure AD設定
    oneDrive: {
        clientId: "bf36c6fd-b915-4037-a1f3-8c05cc122f62",
        authority: "https://login.microsoftonline.com/common",
        redirectUri: `${window.location.protocol}//${window.location.host}/my-fruits-basket/`,
        scopes: ["files.read", "files.readwrite", "user.read"]
    },

    // アプリケーション設定
    app: {
        pageSize: 20,                    // 1回に取得する投稿数
        maxImageSize: 5 * 1024 * 1024,  // 最大画像サイズ (5MB)
        supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        defaultColumnCount: 3,           // デスクトップでのデフォルト列数
        apiRetryAttempts: 3,            // API失敗時のリトライ回数
        cacheExpireTime: 30 * 60 * 1000 // キャッシュ有効期限 (30分)
    },

    // UI設定
    ui: {
        breakpoints: {
            mobile: 767,
            tablet: 991,
            desktop: 992
        },
        animation: {
            fadeIn: 300,
            slideUp: 250
        }
    }
};

// 開発環境での設定オーバーライド（オプション）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // 開発環境用の設定があればここで上書き
    CONFIG.app.pageSize = 5; // 開発時は少なめに
    console.log('開発環境モードで動作しています');
}

// グローバルに設定を公開
window.APP_CONFIG = CONFIG;