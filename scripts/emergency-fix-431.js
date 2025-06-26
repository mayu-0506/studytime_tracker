#!/usr/bin/env node

/**
 * HTTP 431エラー緊急修復スクリプト
 * このスクリプトを実行してCookieを完全にクリーンアップします
 */

console.log('🚨 HTTP 431 緊急修復を開始します...\n')

// ブラウザで実行するスクリプト
const browserScript = `
// === ブラウザのコンソールで実行してください ===

console.log('🧹 Cookieクリーンアップ開始...');

// 1. 全てのSupabase関連Cookieを削除
document.cookie.split(';').forEach(cookie => {
  const [name] = cookie.trim().split('=');
  if (name.includes('supabase') || name.includes('auth') || name.includes('sb-')) {
    // Cookieを削除
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + location.hostname;
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + location.hostname;
    console.log('削除:', name);
  }
});

// 2. localStorageのクリーンアップ
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth')) {
    localStorage.removeItem(key);
    console.log('localStorage削除:', key);
  }
});

// 3. sessionStorageのクリーンアップ
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('auth')) {
    sessionStorage.removeItem(key);
    console.log('sessionStorage削除:', key);
  }
});

console.log('✅ クリーンアップ完了！ページをリロードしてください。');
`

console.log('🌐 ブラウザで以下の手順を実行してください:\n')
console.log('1. Chrome/Edge/Safari のDevToolsを開く (F12 または右クリック→検証)')
console.log('2. Console タブを選択')
console.log('3. 以下のコードをコピー&ペーストして Enter:')
console.log('')
console.log('```javascript')
console.log(browserScript)
console.log('```')
console.log('')
console.log('4. 実行後、ブラウザを完全に閉じて再度開く')
console.log('5. プライベートブラウジング/シークレットモードでもテスト')

// サーバー側の対策も出力
console.log('\n📝 開発サーバー起動方法:')
console.log('')
console.log('通常の npm run dev の代わりに以下を使用:')
console.log('')
console.log('npm run dev-large-headers')
console.log('')
console.log('または、直接実行:')
console.log('')
console.log('node --max-http-header-size=32768 node_modules/.bin/next dev')
console.log('')

// .env.local の確認事項
console.log('\n⚙️ .env.local に以下を追加（もし未設定なら）:')
console.log('')
console.log('# HTTPヘッダーサイズ制限の緩和')
console.log('NODE_OPTIONS="--max-http-header-size=32768"')
console.log('')

console.log('\n🎯 実行後も問題が続く場合:')
console.log('1. Supabaseダッシュボードにログイン')
console.log('2. Authentication → Users で該当ユーザーを探す')
console.log('3. User Metadataから profile_image フィールドを手動削除')
console.log('4. または新しいユーザーアカウントでテスト')