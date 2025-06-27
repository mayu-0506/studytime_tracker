#!/bin/bash

# Study Time Tracker - キャッシュクリアスクリプト

echo "🧹 キャッシュをクリアしています..."

# .nextディレクトリを削除
if [ -d ".next" ]; then
    echo "📁 .nextディレクトリを削除中..."
    rm -rf .next
    echo "✅ .nextディレクトリを削除しました"
else
    echo "ℹ️  .nextディレクトリが見つかりません"
fi

# node_modulesのキャッシュを削除
if [ -d "node_modules/.cache" ]; then
    echo "📁 node_modules/.cacheを削除中..."
    rm -rf node_modules/.cache
    echo "✅ node_modules/.cacheを削除しました"
else
    echo "ℹ️  node_modules/.cacheが見つかりません"
fi

# TypeScriptビルド情報を削除
if [ -f "tsconfig.tsbuildinfo" ]; then
    echo "📄 tsconfig.tsbuildinfoを削除中..."
    rm -f tsconfig.tsbuildinfo
    echo "✅ tsconfig.tsbuildinfoを削除しました"
fi

echo ""
echo "🎉 キャッシュクリアが完了しました！"
echo ""
echo "次のコマンドで開発サーバーを起動してください："
echo "  npm run dev"