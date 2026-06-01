'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'

export type ThemePreference = 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

type ThemeContextValue = {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const themeStorageKey = 'wiseflow-theme'
const accountStorageKey = 'flowsys-account'

function applyLightTheme() {
  const root = document.documentElement
  root.dataset.theme = 'light'
  root.dataset.themePreference = 'light'
  root.style.colorScheme = 'light'
}

function persistLightTheme() {
  window.localStorage.setItem(themeStorageKey, 'light')

  try {
    const accountRaw = window.localStorage.getItem(accountStorageKey)
    const account = accountRaw ? JSON.parse(accountRaw) : {}
    account.theme = 'Bright'
    window.localStorage.setItem(accountStorageKey, JSON.stringify(account))
  } catch {
    // Theme storage is best-effort because auth can recreate the account object.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const refresh = () => {
      applyLightTheme()
      persistLightTheme()
    }

    window.addEventListener('flowsys-theme-change', refresh)
    refresh()

    return () => {
      window.removeEventListener('flowsys-theme-change', refresh)
    }
  }, [])

  const setTheme: ThemeContextValue['setTheme'] = () => {
    applyLightTheme()
    persistLightTheme()
    window.dispatchEvent(new Event('flowsys-theme-change'))
  }

  const value = useMemo(
    () => ({ theme: 'light' as ThemePreference, resolvedTheme: 'light' as ResolvedTheme, setTheme }),
    [],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
