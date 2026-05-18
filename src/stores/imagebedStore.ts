import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { imagebedApi } from '../services/api'
import type { ImagebedConfig, ImagebedSettings } from '../types'

interface ImagebedState {
  configs: ImagebedConfig[]
  settings: ImagebedSettings | null
  loading: boolean
  error: string | null

  setConfigs: (configs: ImagebedConfig[]) => void
  setSettings: (settings: ImagebedSettings) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  loadConfigs: (token: string) => Promise<void>
  loadSettings: (token: string) => Promise<void>
  createConfig: (token: string, data: any) => Promise<ImagebedConfig>
  updateConfig: (token: string, id: string, data: any) => Promise<ImagebedConfig>
  deleteConfig: (token: string, id: string) => Promise<void>
  toggleConfig: (token: string, id: string, enabled: number) => Promise<ImagebedConfig>
  updateSettings: (token: string, data: any) => Promise<ImagebedSettings>

  getEnabledConfigs: () => ImagebedConfig[]
  getRandomEnabledConfig: () => ImagebedConfig | null
}

export const useImagebedStore = create<ImagebedState>()(
  persist(
    (set, get) => ({
      configs: [],
      settings: null,
      loading: false,
      error: null,

      setConfigs: (configs) => set({ configs }),
      setSettings: (settings) => set({ settings }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      loadConfigs: async (token) => {
        set({ loading: true, error: null })
        try {
          const configs = await imagebedApi.listConfigs(token)
          set({ configs, loading: false })
        } catch (err: any) {
          set({ error: err.message, loading: false })
        }
      },

      loadSettings: async (token) => {
        set({ loading: true, error: null })
        try {
          const settings = await imagebedApi.getSettings(token)
          set({ settings, loading: false })
        } catch (err: any) {
          set({ error: err.message, loading: false })
        }
      },

      createConfig: async (token, data) => {
        const config = await imagebedApi.createConfig(token, data)
        set((state) => ({ configs: [...state.configs, config] }))
        return config
      },

      updateConfig: async (token, id, data) => {
        const config = await imagebedApi.updateConfig(token, id, data)
        set((state) => ({
          configs: state.configs.map((c) => (c.id === id ? config : c)),
        }))
        return config
      },

      deleteConfig: async (token, id) => {
        await imagebedApi.deleteConfig(token, id)
        set((state) => ({ configs: state.configs.filter((c) => c.id !== id) }))
      },

      toggleConfig: async (token, id, enabled) => {
        const config = await imagebedApi.toggleConfig(token, id, enabled)
        set((state) => ({
          configs: state.configs.map((c) => (c.id === id ? config : c)),
        }))
        return config
      },

      updateSettings: async (token, data) => {
        const settings = await imagebedApi.updateSettings(token, data)
        set({ settings })
        return settings
      },

      getEnabledConfigs: () => {
        return get().configs.filter((c) => c.enabled === 1)
      },

      getRandomEnabledConfig: () => {
        const enabled = get().configs.filter((c) => c.enabled === 1)
        if (enabled.length === 0) return null
        return enabled[Math.floor(Math.random() * enabled.length)]
      },
    }),
    {
      name: 'imagebed-storage',
      partialize: (state) => ({ configs: state.configs, settings: state.settings }),
    }
  )
)
