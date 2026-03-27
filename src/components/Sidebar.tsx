'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/produtos', label: 'Produtos', icon: BoxIcon },
  { href: '/comercial', label: 'Comercial', icon: Calculator },
  { href: '/producao', label: 'Producao', icon: Hammer },
  { href: '/suprimentos', label: 'Suprimentos', icon: Package },
  { href: '/rh', label: 'RH', icon: Users },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/configuracoes', label: 'Configuracoes', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <>
      {/* Company branding */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-grafite-700">
        <div className="w-10 h-10 bg-amarelo rounded-lg flex items-center justify-center">
          <Hammer className="w-6 h-6 text-grafite-950" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-100 tracking-wide">
            Metal<span className="text-amarelo">Gestao</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-grafite-400 font-medium">
            Sistema Industrial
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
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
                    ? 'bg-amarelo/10 text-amarelo border-l-[3px] border-amarelo pl-[9px]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-grafite-700/50 border-l-[3px] border-transparent pl-[9px]'
                }
              `}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-amarelo' : ''}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-grafite-700">
        <p className="text-xs text-grafite-500 text-center">
          MetalGestao v1.0
        </p>
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
