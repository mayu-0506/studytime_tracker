import Link from "next/link"
import { Settings, User, Lock } from "lucide-react"

interface SettingLayoutProps {
  children: React.ReactNode
}

const SettingLayout = ({ children }: SettingLayoutProps) => {
  const menuItems = [
    { href: "/settings/profile", label: "プロフィール", icon: User },
    { href: "/settings/password", label: "パスワード変更", icon: Lock },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-8">
          <aside className="w-64">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                設定
              </h2>
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
          <main className="flex-1 bg-white rounded-lg shadow p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

export default SettingLayout