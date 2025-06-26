#!/usr/bin/env node

/**
 * Supabase認証Cookie監視スクリプト
 * HTTP 431エラーの原因となる大きなCookieを検出
 */

const fs = require('fs')
const path = require('path')

console.log('🍪 Supabase Cookie サイズ監視を開始...\n')

// Cookie監視用のブラウザスクリプト生成
const browserScript = `
// ブラウザのコンソールで実行するCookie監視スクリプト
(function() {
  console.log('🍪 Supabase Cookie 監視開始');
  
  function analyzeCookies() {
    const cookies = document.cookie.split(';');
    let totalSize = 0;
    const cookieAnalysis = [];
    
    cookies.forEach(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=');
      const value = valueParts.join('=');
      const size = (name + '=' + value).length;
      totalSize += size;
      
      if (name.includes('supabase') || name.includes('auth') || size > 1000) {
        cookieAnalysis.push({
          name: name,
          size: size,
          sizeKB: (size / 1024).toFixed(2),
          preview: value.substring(0, 100) + (value.length > 100 ? '...' : '')
        });
      }
    });
    
    console.log('📊 Cookie 分析結果:');
    console.log(\`総サイズ: \${totalSize} bytes (\${(totalSize / 1024).toFixed(2)} KB)\`);
    
    if (totalSize > 4096) {
      console.warn('⚠️ Cookieサイズが4KBを超えています！HTTP 431エラーの可能性があります');
    }
    
    if (totalSize > 8192) {
      console.error('🚨 Cookieサイズが8KBを超えています！HTTP 431エラーが確実に発生します');
    }
    
    console.table(cookieAnalysis);
    
    // Base64データの検出
    cookieAnalysis.forEach(cookie => {
      if (cookie.preview.includes('data:image/') || cookie.preview.includes('base64')) {
        console.error(\`🚨 Base64画像データが検出されました: \${cookie.name}\`);
      }
    });
    
    return { totalSize, cookies: cookieAnalysis };
  }
  
  // 初回分析
  const result = analyzeCookies();
  
  // Cookie変更監視
  let lastCookieString = document.cookie;
  setInterval(() => {
    if (document.cookie !== lastCookieString) {
      console.log('🔄 Cookie変更を検出');
      analyzeCookies();
      lastCookieString = document.cookie;
    }
  }, 1000);
  
  return result;
})();
`

// ブラウザスクリプトをファイルに保存
const scriptPath = path.join(process.cwd(), 'scripts', 'browser-cookie-monitor.js')
fs.writeFileSync(scriptPath, browserScript)

console.log('📄 ブラウザ監視スクリプトを生成しました:')
console.log(`   ${scriptPath}`)
console.log('')

// 使用方法の説明
console.log('🔧 使用方法:')
console.log('1. ブラウザでアプリを開く')
console.log('2. DevTools > Console を開く')
console.log('3. 以下のスクリプトをコピー&ペーストして実行:')
console.log('')
console.log('```javascript')
console.log(browserScript)
console.log('```')
console.log('')

// Next.js開発サーバー向けのHTTPヘッダーサイズ監視
const nextConfigCheck = `
// next.config.ts に追加する設定例

const nextConfig = {
  // HTTPヘッダーサイズ制限を一時的に拡大（本格対策ではない）
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  
  // 開発時のヘッダーサイズ監視
  async headers() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Cookie-Size-Warning',
              value: 'Monitor cookie sizes to prevent HTTP 431'
            }
          ]
        }
      ]
    }
    return []
  }
}

export default nextConfig
`

console.log('⚙️ Next.js設定の推奨事項:')
console.log(nextConfigCheck)

// Node.js起動時のHTTPヘッダーサイズ拡大オプション
console.log('🚨 緊急対応（一時的）:')
console.log('Node.jsのHTTPヘッダーサイズ制限を拡大:')
console.log('')
console.log('package.json の scripts セクションに追加:')
console.log('"dev-large-headers": "node --max-http-header-size=16384 node_modules/.bin/next dev"')
console.log('')
console.log('ただし、これは根本解決ではありません！')
console.log('Cookieサイズを削減することが重要です。')

})();