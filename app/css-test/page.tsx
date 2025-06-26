import Layout from "@/components/Layout"

export default function CSSTestPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-blue-600">
          CSS Test Page
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Color Test</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-red-500 text-white p-4 rounded text-center">Red</div>
            <div className="bg-blue-500 text-white p-4 rounded text-center">Blue</div>
            <div className="bg-green-500 text-white p-4 rounded text-center">Green</div>
            <div className="bg-yellow-500 text-white p-4 rounded text-center">Yellow</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Typography Test</h2>
          <p className="text-sm text-gray-600">Small text</p>
          <p className="text-base text-gray-700">Base text</p>
          <p className="text-lg text-gray-800">Large text</p>
          <p className="text-xl font-bold text-gray-900">Extra large bold text</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Spacing Test</h2>
          <div className="space-y-4">
            <div className="p-2 bg-gray-200">Padding 2</div>
            <div className="p-4 bg-gray-300">Padding 4</div>
            <div className="p-8 bg-gray-400">Padding 8</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Button Test</h2>
          <div className="space-x-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
              Primary Button
            </button>
            <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
              Secondary Button
            </button>
            <button className="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-bold py-2 px-4 rounded">
              Outline Button
            </button>
          </div>
        </div>
        
        <div className="mt-8 text-center text-gray-600">
          <p>If you can see styled elements above, Tailwind CSS is working correctly.</p>
          <p>If everything looks unstyled, there&apos;s an issue with the CSS configuration.</p>
        </div>
      </div>
    </div>
    </Layout>
  )
}