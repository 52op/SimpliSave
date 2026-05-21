import { create } from 'zustand'
import { siteSettingsApi } from '../services/api'
import type { SiteSettings } from '../types'

interface SiteSettingsState {
  settings: SiteSettings | null
  load: () => Promise<void>
  update: (token: string, data: any) => Promise<SiteSettings>
}

export const useSiteSettingsStore = create<SiteSettingsState>()((set) => ({
  settings: null,

  load: async () => {
    try {
      const settings = await siteSettingsApi.get()
      set({ settings })
    } catch {}
  },

  update: async (token, data) => {
    const settings = await siteSettingsApi.update(token, data)
    set({ settings })
    return settings
  },
}))
