import Layout from "@/components/Layout"

export default function TestPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Tailwind CSS テスト
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            基本的なスタイル
          </h2>
          <p className="text-gray-600">
            これはTailwind CSSのテストページです。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-500 text-white p-4 rounded">
            Blue Box
          </div>
          <div className="bg-green-500 text-white p-4 rounded">
            Green Box
          </div>
          <div className="bg-red-500 text-white p-4 rounded">
            Red Box
          </div>
        </div>

        <div className="mt-4 space-x-2">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded">
            Primary Button
          </button>
          <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded">
            Secondary Button
          </button>
        </div>
      </div>
    </div>
    </Layout>
  );
}