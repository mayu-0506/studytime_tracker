"use client"

import Link from "next/link"
import { Clock, Target, TrendingUp, BookOpen } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/AuthContext"

export default function Home() {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    // ログイン済みの場合はダッシュボードへリダイレクト
    if (!loading && user) {
      router.push('/main')
    }
  }, [user, loading, router])

  // ローディング中またはリダイレクト中は何も表示しない
  if (loading || user) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100"></div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* ヒーローセクション */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <Clock className="w-16 h-16 text-blue-600" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Study Time Tracker
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              高校生・受験生のための勉強時間記録・可視化アプリ
              <br />
              科目別に学習時間を記録し、目標達成に向けた進捗を可視化しましょう
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                今すぐ始める
              </Link>
              <Link
                href="/login"
                className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                ログイン
              </Link>
            </div>
          </div>
        </section>

        {/* 機能紹介 */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              主な機能
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="flex justify-center mb-4">
                  <Target className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">科目別記録</h3>
                <p className="text-gray-600">
                  数学、英語、国語など科目ごとに学習時間を詳細に記録。色分けで見やすく管理できます。
                </p>
              </div>
              <div className="text-center p-6">
                <div className="flex justify-center mb-4">
                  <TrendingUp className="w-12 h-12 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">進捗可視化</h3>
                <p className="text-gray-600">
                  グラフとカレンダーで学習進捗を可視化。モチベーション維持に効果的です。
                </p>
              </div>
              <div className="text-center p-6">
                <div className="flex justify-center mb-4">
                  <BookOpen className="w-12 h-12 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">目標設定</h3>
                <p className="text-gray-600">
                  日次・週次・月次の目標を設定し、達成度を追跡。計画的な学習をサポートします。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA セクション */}
        <section className="py-16 px-4 bg-blue-600 text-white text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              今すぐ学習記録を始めませんか？
            </h2>
            <p className="text-xl mb-8 opacity-90">
              無料でアカウントを作成して、効率的な学習管理を体験してください
            </p>
            <Link
              href="/signup"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors inline-block"
            >
              無料で始める
            </Link>
          </div>
        </section>
      </div>
  )
}