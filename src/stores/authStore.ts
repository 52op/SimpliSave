import { create } from "zustand"
import { persist } from "zustand/middleware"
import { authApi } from "../services/api"

type User = { id: string; email: string; name: string; role?: string }

type AuthStore = {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      login: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const result = await authApi.login(email, password)
          set({ user: result.user, token: result.token, loading: false })
        } catch (error: any) {
          set({ error: error.message || "Login failed", loading: false })
        }
      },
      register: async (name, email, password) => {
        set({ loading: true, error: null })
        try {
          const result = await authApi.register(email, name, password)
          set({ user: result.user, token: result.token, loading: false })
        } catch (error: any) {
          set({ error: error.message || "Registration failed", loading: false })
        }
      },
      logout: () => {
        set({ user: null, token: null, error: null })
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
