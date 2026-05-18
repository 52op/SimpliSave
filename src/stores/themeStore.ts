import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ThemeStore {
  dark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () =>
        set((s) => {
          const next = !s.dark
          if (next) document.documentElement.classList.add("dark")
          else document.documentElement.classList.remove("dark")
          return { dark: next }
        }),
    }),
    { name: "theme-storage" }
  )
)
