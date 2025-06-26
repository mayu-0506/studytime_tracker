"use client"

import { useCookieMonitor } from "@/hooks/useCookieMonitor"

export default function CookieMonitorProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  // Cookie監視フックを使用
  useCookieMonitor()

  return <>{children}</>
}