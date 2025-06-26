#!/usr/bin/env node

/**
 * Cookie健全性チェックスクリプト
 * 定期実行でHTTP 431エラーを予防
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🏥 Cookie健全性チェックを開始...\n')

// package.json のチェック
function checkPackageJson() {
  console.log('📦 package.json をチェック中...')
  
  const packagePath = path.join(process.cwd(), 'package.json')
  if (!fs.existsSync(packagePath)) {
    console.error('❌ package.json が見つかりません')
    return false
  }
  
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  
  // 緊急時のヘッダーサイズ拡大スクリプトをチェック
  const scripts = pkg.scripts || {}
  
  if (!scripts['dev-large-headers']) {
    console.log('💡 緊急時用のスクリプトを追加することをお勧めします:')
    console.log('   "dev-large-headers": "node --max-http-header-size=16384 node_modules/.bin/next dev"')
  } else {
    console.log('✅ 緊急時用スクリプトが設定されています')
  }
  
  if (!scripts['cookie-monitor']) {
    console.log('💡 Cookie監視スクリプトの追加をお勧めします:')
    console.log('   "cookie-monitor": "node scripts/monitor-cookies.js"')
  } else {
    console.log('✅ Cookie監視スクリプトが設定されています')
  }
  
  return true
}

// middleware.ts の健全性チェック
function checkMiddleware() {
  console.log('\n🔧 middleware.ts をチェック中...')
  
  const middlewarePath = path.join(process.cwd(), 'middleware.ts')
  if (!fs.existsSync(middlewarePath)) {
    console.error('❌ middleware.ts が見つかりません')
    return false
  }
  
  const content = fs.readFileSync(middlewarePath, 'utf8')
  
  // 重要な機能のチェック
  const checks = [
    { 
      pattern: /REDIRECT_COUNT_HEADER/,
      name: 'リダイレクトループ検知',
      critical: true
    },
    {
      pattern: /cookieSize.*>.*4096/,
      name: 'Cookieサイズ監視',
      critical: true
    },
    {
      pattern: /MAX_REDIRECTS/,
      name: 'リダイレクト制限',
      critical: true
    },
    {
      pattern: /console\\.error.*Cookie too large/,
      name: 'Cookie過大エラーログ',
      critical: false
    }
  ]
  
  let hasIssues = false
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.name}: 実装済み`)
    } else {
      const status = check.critical ? '❌' : '⚠️'
      console.log(`${status} ${check.name}: 未実装`)
      if (check.critical) hasIssues = true
    }
  })
  
  return !hasIssues
}

// Supabase middleware の健全性チェック
function checkSupabaseMiddleware() {
  console.log('\n🗃️ Supabase middleware をチェック中...')
  
  const supabaseMiddlewarePath = path.join(process.cwd(), 'utils', 'supabase', 'middleware.ts')
  if (!fs.existsSync(supabaseMiddlewarePath)) {
    console.error('❌ utils/supabase/middleware.ts が見つかりません')
    return false
  }
  
  const content = fs.readFileSync(supabaseMiddlewarePath, 'utf8')
  
  const checks = [
    {
      pattern: /delete parsed\.user_metadata\.profile_image/,
      name: 'Base64画像データ除去',
      critical: true
    },
    {
      pattern: /optimizedValue.*length.*4096/,
      name: 'Cookie軽量化',
      critical: true
    },
    {
      pattern: /totalSize.*6144/,
      name: '総Cookieサイズ監視',
      critical: false
    }
  ]
  
  let hasIssues = false
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.name}: 実装済み`)
    } else {
      const status = check.critical ? '❌' : '⚠️'
      console.log(`${status} ${check.name}: 未実装`)
      if (check.critical) hasIssues = true
    }
  })
  
  return !hasIssues
}

// Next.js設定の確認
function checkNextConfig() {
  console.log('\n⚙️ Next.js設定をチェック中...')
  
  const nextConfigPath = path.join(process.cwd(), 'next.config.ts')
  const nextConfigJsPath = path.join(process.cwd(), 'next.config.js')
  
  let configPath = null
  if (fs.existsSync(nextConfigPath)) {
    configPath = nextConfigPath
  } else if (fs.existsSync(nextConfigJsPath)) {
    configPath = nextConfigJsPath
  } else {
    console.log('⚠️ next.config.ts/js が見つかりません')
    return true // 必須ではないため、エラーにしない
  }
  
  if (configPath) {
    const content = fs.readFileSync(configPath, 'utf8')
    
    if (content.includes('serverComponentsExternalPackages')) {
      console.log('✅ Supabase最適化設定があります')
    } else {
      console.log('💡 next.config.ts に以下の最適化設定を追加することをお勧めします:')
      console.log('   experimental: { serverComponentsExternalPackages: ["@supabase/supabase-js"] }')
    }
  }
  
  return true
}

// 開発サーバーの起動テスト
function testDevServer() {
  console.log('\n🚀 開発サーバー起動テスト...')
  
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      timeout: 10000
    })
    
    let hasStarted = false
    let hasError = false
    
    child.stdout.on('data', (data) => {
      const output = data.toString()
      if (output.includes('Ready in')) {
        hasStarted = true
        console.log('✅ 開発サーバーが正常に起動しました')
        child.kill()
        resolve(true)
      }
    })
    
    child.stderr.on('data', (data) => {
      const output = data.toString()
      if (output.includes('EADDRINUSE') || output.includes('port') && output.includes('in use')) {
        console.log('⚠️ ポートが使用中です（正常）')
        hasStarted = true
        child.kill()
        resolve(true)
      } else if (output.includes('Error') || output.includes('error')) {
        console.error('❌ 開発サーバー起動エラー:', output.trim())
        hasError = true
      }
    })
    
    setTimeout(() => {
      if (!hasStarted && !hasError) {
        console.log('⚠️ 開発サーバー起動テストがタイムアウトしました')
      }
      child.kill()
      resolve(!hasError)
    }, 8000)
  })
}

// メイン実行
async function main() {
  const results = [
    checkPackageJson(),
    checkMiddleware(),
    checkSupabaseMiddleware(),
    checkNextConfig()
  ]
  
  // 開発サーバーテストは任意
  try {
    const serverTest = await testDevServer()
    results.push(serverTest)
  } catch (error) {
    console.log('⚠️ 開発サーバーテストをスキップしました')
  }
  
  console.log('\n📊 チェック結果:')
  const passedChecks = results.filter(Boolean).length
  const totalChecks = results.length
  
  console.log(`✅ ${passedChecks}/${totalChecks} のチェックが合格`)
  
  if (passedChecks === totalChecks) {
    console.log('🎉 すべてのチェックが合格しました！')
    console.log('\n📝 継続的な監視のために:')
    console.log('1. 毎日: npm run cookie-monitor')
    console.log('2. 週次: node scripts/cookie-health-check.js')
    console.log('3. プロファイル画像追加前: Cookie サイズ確認')
    process.exit(0)
  } else {
    console.log('❌ いくつかの問題が検出されました。上記の項目を修正してください。')
    process.exit(1)
  }
}

main().catch(console.error)