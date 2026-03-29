'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Calculator,
  Hammer,
  Package,
  Users,
  DollarSign,
  Menu,
  X,
  ChevronLeft,
  BoxIcon,
  Settings,
  UserCog,
  LogOut,
  Map,
  Building2,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useTheme } from './ThemeProvider'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/produtos', label: 'Produtos', icon: BoxIcon },
  { href: '/clientes', label: 'Clientes', icon: Building2 },
  { href: '/comercial', label: 'Comercial', icon: Calculator },
  { href: '/producao', label: 'Producao', icon: Hammer },
  { href: '/suprimentos', label: 'Suprimentos', icon: Package },
  { href: '/rh', label: 'RH', icon: Users },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/configuracoes', label: 'Configuracoes', icon: Settings },
  { href: '/mapa', label: 'Mapa do Sistema', icon: Map },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const userRole = (session?.user as any)?.role || ''
  const isAdmin = userRole === 'ADMIN'

  // Parse allowed pages
  const allowedPages: string[] = (() => {
    if (isAdmin) return [] // Admin sees everything
    try {
      const raw = (session?.user as any)?.allowedPages
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })()

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter((item) => {
    if (isAdmin) return true
    if (allowedPages.length === 0) return true // No restrictions if empty
    return allowedPages.includes(item.href)
  })

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const primaryColor = theme.primaryColor

  const SidebarContent = () => (
    <>
      {/* Company branding */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-grafite-700">
        {theme.logoPath ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-grafite-800">
            <img src={theme.logoPath} alt="Logo" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.primaryColor }}>
            <Hammer className="w-6 h-6 text-grafite-950" />
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold text-gray-100 tracking-wide">
            {theme.companyName}
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-grafite-400 font-medium">
            {theme.companySubtitle}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  active
                    ? 'border-l-[3px] pl-[9px]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-grafite-700/50 border-l-[3px] border-transparent pl-[9px]'
                }
              `}
              style={active ? { color: primaryColor, borderColor: primaryColor, backgroundColor: `${primaryColor}15` } : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" style={active ? { color: primaryColor } : undefined} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* Admin-only: User Management */}
        {isAdmin && (
          <>
            <div className="pt-3 mt-3 border-t border-grafite-700">
              <p className="px-3 text-[10px] uppercase tracking-wider text-grafite-500 font-semibold mb-2">
                Administracao
              </p>
              <Link
                href="/usuarios"
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    isActive('/usuarios')
                      ? 'border-l-[3px] pl-[9px]'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-grafite-700/50 border-l-[3px] border-transparent pl-[9px]'
                  }
                `}
                style={isActive('/usuarios') ? { color: primaryColor, borderColor: primaryColor, backgroundColor: `${primaryColor}15` } : undefined}
              >
                <UserCog className="w-5 h-5 flex-shrink-0" style={isActive('/usuarios') ? { color: primaryColor } : undefined} />
                <span>Usuarios</span>
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* User info + Logout */}
      <div className="px-4 py-4 border-t border-grafite-700">
        {session?.user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}33` }}>
              <span className="text-xs font-bold" style={{ color: primaryColor }}>
                {session.user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{session.user.name}</p>
              <p className="text-[10px] text-grafite-400 uppercase">{userRole}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-grafite-700/50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-grafite-800 border border-grafite-700 rounded-lg p-2 text-gray-400 hover:text-gray-200 transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-grafite-900 border-r border-grafite-700 z-50
          flex flex-col transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-64 bg-grafite-900 border-r border-grafite-700 flex-col z-30">
        <SidebarContent />
      </aside>
    </>
  )
}
