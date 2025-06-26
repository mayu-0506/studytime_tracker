import { Suspense } from "react"
import Link from "next/link"
import { getSubjects } from "@/actions/subjects"
import SubjectList from "@/components/subjects/SubjectList"
import { Plus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Layout from "@/components/Layout"

export default async function SubjectsPage() {
  const result = await getSubjects()
  const subjects = result.success ? result.data || [] : []
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/main"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          ダッシュボードに戻る
        </Link>
      </div>
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">科目管理</h1>
        <Link href="/subjects/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            新しい科目を追加
          </Button>
        </Link>
      </div>
      
      <Suspense fallback={
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      }>
        <SubjectList initialSubjects={subjects} />
      </Suspense>
    </div>
    </Layout>
  )
}