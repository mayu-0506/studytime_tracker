#!/usr/bin/env node

/**
 * 依存関係のバージョン不整合を検出するスクリプト
 * Usage: node scripts/check-versions.js
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 バージョン不整合チェックを開始...\n')

// package.json を読み込み
const packageJsonPath = path.join(process.cwd(), 'package.json')
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json が見つかりません')
  process.exit(1)
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const { dependencies = {}, devDependencies = {} } = packageJson

// 重要な依存関係のバージョンチェック
const criticalDeps = {
  'next': { expected: '^15.0.0', actual: dependencies.next },
  'react': { expected: '^19.0.0', actual: dependencies.react },
  'react-dom': { expected: '^19.0.0', actual: dependencies['react-dom'] },
  '@supabase/supabase-js': { expected: '^2.0.0', actual: dependencies['@supabase/supabase-js'] },
  '@supabase/ssr': { expected: '^0.6.0', actual: dependencies['@supabase/ssr'] },
  'typescript': { expected: '^5.0.0', actual: devDependencies.typescript }
}

console.log('📦 重要な依存関係:')
let hasIssues = false

Object.entries(criticalDeps).forEach(([name, { expected, actual }]) => {
  if (!actual) {
    console.log(`❌ ${name}: 未インストール (推奨: ${expected})`)
    hasIssues = true
  } else {
    const isCompatible = checkVersionCompatibility(actual, expected)
    const status = isCompatible ? '✅' : '⚠️'
    console.log(`${status} ${name}: ${actual} (推奨: ${expected})`)
    if (!isCompatible) hasIssues = true
  }
})

// Tailwind CSS 設定チェック
console.log('\n🎨 TailwindCSS 設定:')
const tailwindConfigPath = path.join(process.cwd(), 'tailwind.config.ts')
if (fs.existsSync(tailwindConfigPath)) {
  console.log('✅ tailwind.config.ts: 存在')
} else {
  console.log('❌ tailwind.config.ts: 見つかりません')
  hasIssues = true
}

// Next.js 設定チェック
console.log('\n⚙️ Next.js 設定:')
const nextConfigPath = path.join(process.cwd(), 'next.config.ts')
if (fs.existsSync(nextConfigPath)) {
  console.log('✅ next.config.ts: 存在')
} else {
  const nextConfigJs = path.join(process.cwd(), 'next.config.js')
  if (fs.existsSync(nextConfigJs)) {
    console.log('✅ next.config.js: 存在')
  } else {
    console.log('❌ Next.js設定ファイル: 見つかりません')
    hasIssues = true
  }
}

// TypeScript 設定チェック
console.log('\n📝 TypeScript 設定:')
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
if (fs.existsSync(tsconfigPath)) {
  console.log('✅ tsconfig.json: 存在')
} else {
  console.log('❌ tsconfig.json: 見つかりません')
  hasIssues = true
}

// App Router 必須ファイルチェック
console.log('\n📂 App Router 必須ファイル:')
const requiredFiles = [
  'app/layout.tsx',
  'app/page.tsx',
  'app/error.tsx',
  'app/loading.tsx',
  'app/not-found.tsx',
  'app/global-error.tsx'
]

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}: 存在`)
  } else {
    console.log(`⚠️ ${file}: 見つかりません`)
    if (file === 'app/error.tsx' || file === 'app/global-error.tsx') {
      hasIssues = true
    }
  }
})

// 結果サマリー
console.log('\n📊 チェック結果:')
if (hasIssues) {
  console.log('❌ 問題が検出されました。上記の項目を確認してください。')
  console.log('\n🔧 修正コマンド例:')
  console.log('npm install  # 依存関係を再インストール')
  console.log('npm audit fix  # 脆弱性を修正')
  console.log('npm run build  # ビルドテスト')
  process.exit(1)
} else {
  console.log('✅ すべて正常です！')
  process.exit(0)
}

/**
 * バージョン互換性をチェック
 */
function checkVersionCompatibility(actual, expected) {
  // 簡易的なバージョンチェック（セマンティックバージョニング対応）
  const actualVersion = actual.replace(/[^0-9.]/g, '')
  const expectedVersion = expected.replace(/[^0-9.]/g, '')
  
  const actualMajor = parseInt(actualVersion.split('.')[0] || '0')
  const expectedMajor = parseInt(expectedVersion.split('.')[0] || '0')
  
  return actualMajor >= expectedMajor
}