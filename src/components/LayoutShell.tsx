'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Sidebar from './Sidebar'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { status } = useSession()
  const isLoginPage = pathname === '/login'
  const isAuthenticated = status === 'authenticated'

  if (isLoginPage || !isAuthenticated) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <>
      <Sidebar />
      <main className="min-h-screen lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8">
        {children}
      </main>
    </>
  )
}
