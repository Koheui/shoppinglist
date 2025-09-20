// 家族共有パスワード設定
// このファイルでパスワードを変更できます
const FAMILY_CONFIG = {
    password: '162500', // 家族共有パスワード
    // パスワードの要件:
    // - 4文字以上20文字以下
    // - 英数字のみ推奨
    // - 家族全員が覚えやすいもの
};

// 設定をエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FAMILY_CONFIG;
} else {
    window.FAMILY_CONFIG = FAMILY_CONFIG;
}
