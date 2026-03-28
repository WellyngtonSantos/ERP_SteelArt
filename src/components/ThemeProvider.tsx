'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface ThemeConfig {
  companyName: string
  companySubtitle: string
  logoPath: string | null
  primaryColor: string
  secondaryColor: string
}

const defaultTheme: ThemeConfig = {
  companyName: 'SteelArt',
  companySubtitle: 'Estruturas Metalicas',
  logoPath: null,
  primaryColor: '#d97706',
  secondaryColor: '#292524',
}

const ThemeContext = createContext<{
  theme: ThemeConfig
  refreshTheme: () => void
}>({ theme: defaultTheme, refreshTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)

  const refreshTheme = useCallback(async () => {
    try {
      const res = await fetch('/api/budget-template')
      if (res.ok) {
        const data = await res.json()
        setTheme({
          companyName: data.companyName || defaultTheme.companyName,
          companySubtitle: data.companySubtitle || defaultTheme.companySubtitle,
          logoPath: data.logoPath || null,
          primaryColor: data.primaryColor || defaultTheme.primaryColor,
          secondaryColor: data.secondaryColor || defaultTheme.secondaryColor,
        })
      }
    } catch {
      // Use defaults
    }
  }, [])

  useEffect(() => {
    refreshTheme()
  }, [refreshTheme])

  // Apply primary color as CSS variable for dynamic theming
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', theme.primaryColor)
  }, [theme.primaryColor])

  return (
    <ThemeContext.Provider value={{ theme, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
