import type { Metadata } from "next"
import "./globals.css"
import ToastProvider from "@/components/providers/ToastProvider"
import CookieMonitorProvider from "@/components/providers/CookieMonitorProvider"
import { AuthProvider } from "@/contexts/AuthContext"
import { TimerProvider } from "@/contexts/TimerContext"
import TimerDataCleaner from "@/components/providers/TimerDataCleaner"

export const metadata: Metadata = {
  title: "Study Time Tracker",
  description: "勉強時間トラッカー",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <ToastProvider />
        <TimerDataCleaner />
        <CookieMonitorProvider>
          <AuthProvider>
            <TimerProvider>
              <div className="flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
                <footer className="border-t py-2">
                  <div className="flex flex-col items-center justify-center text-sm space-y-5">
                    <div>©StudyTime Tracker. ALL Rights Reserved.</div>
                  </div>
                </footer>
              </div>
            </TimerProvider>
          </AuthProvider>
        </CookieMonitorProvider>
      </body>
    </html>
  )
}