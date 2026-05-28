import { create } from "zustand"
import { persist } from "zustand/middleware"
import { authApi } from "../services/api"
import type { AuthState, User } from "../types"
import { normalizeUser } from "../utils/data"

type AuthStore = AuthState & {
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateAvatar: (url: string) => void
  login: (email: string, password: string) => Promise<void>
  loginWithCode: (email: string, code: string) => Promise<void>
  register: (name: string, email: string, password: string, code: string) => Promise<void>
  logout: () => void
  clearError: () => void
  validateSession: () => Promise<void>
  loginWithSSOToken: (token: string) => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      setUser: (user) => set({ user: normalizeUser(user) }),
      setToken: (token) => set({ token }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      updateAvatar: (url) => {
        const current = get().user
        if (current) set({ user: { ...current, avatar_url: url } })
      },
      login: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const result = await authApi.login(email, password)
          set({ user: normalizeUser(result.user), token: result.token, loading: false })
        } catch (error: any) {
          const message = error.message || "Login failed"
          set({ error: message, loading: false, token: null, user: null })
          throw error
        }
      },
      loginWithCode: async (email, code) => {
        set({ loading: true, error: null })
        try {
          const result = await authApi.loginWithCode(email, code)
          set({ user: normalizeUser(result.user), token: result.token, loading: false })
        } catch (error: any) {
          const message = error.message || "Login failed"
          set({ error: message, loading: false, token: null, user: null })
          throw error
        }
      },
      register: async (name, email, password, code) => {
        set({ loading: true, error: null })
        try {
          const result = await authApi.register(email, name, password, code)
          set({ user: normalizeUser(result.user), token: result.token, loading: false })
        } catch (error: any) {
          const message = error.message || "Registration failed"
          set({ error: message, loading: false, token: null, user: null })
          throw error
        }
      },
      logout: () => {
        set({ user: null, token: null, error: null, loading: false })
      },
      clearError: () => set({ error: null }),
      // SSO 回调：GoAuth 登录后携带 token 跳转回来，存入 store 并获取用户信息
      loginWithSSOToken: async (token: string) => {
        set({ loading: true, error: null })
        try {
          const user = await authApi.me(token)
          set({ user: normalizeUser(user), token, loading: false })
        } catch {
          set({ loading: false })
        }
      },
      validateSession: async () => {
        const token = get().token
        if (!token) return
        set({ loading: true })
        try {
          const user = await authApi.me(token)
          set({ user: normalizeUser(user), loading: false, error: null })
        } catch {
          set({ user: null, token: null, loading: false, error: null })
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
