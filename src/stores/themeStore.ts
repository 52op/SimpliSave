import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ThemeMode } from "../types"

interface ThemeStore {
  dark: boolean
  mode: ThemeMode
  initialized: boolean
  toggle: () => void
  setMode: (mode: ThemeMode) => void
  initTheme: () => void
}

function applyTheme(mode: ThemeMode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const isDark = mode === "system" ? prefersDark : mode === "dark"
  document.documentElement.classList.toggle("dark", isDark)
  return isDark
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      dark: false,
      mode: "light",
      initialized: false,
      toggle: () => {
        const nextMode = get().dark ? "light" : "dark"
        const dark = applyTheme(nextMode)
        set({ dark, mode: nextMode, initialized: true })
      },
      setMode: (mode) => {
        const dark = applyTheme(mode)
        set({ dark, mode, initialized: true })
      },
      initTheme: () => {
        const state = get()
        const dark = applyTheme(state.mode ?? "light")
        set({ dark, initialized: true })
      },
    }),
    {
      name: "theme-storage",
      partialize: (state) => ({ dark: state.dark, mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const dark = typeof window !== "undefined" ? applyTheme(state.mode ?? "light") : state.dark
          state.dark = dark
          state.initialized = true
        }
      },
    }
  )
)
