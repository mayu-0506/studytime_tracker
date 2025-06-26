import Layout from "@/components/Layout"

export default function TestCSS() {
  return (
    <Layout>
      <div className="p-8">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">Tailwind CSS Test</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-500 text-white p-4 rounded-lg">Red Box</div>
        <div className="bg-green-500 text-white p-4 rounded-lg">Green Box</div>
        <div className="bg-blue-500 text-white p-4 rounded-lg">Blue Box</div>
      </div>
      <button className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
        Test Button
      </button>
    </div>
    </Layout>
  )
}