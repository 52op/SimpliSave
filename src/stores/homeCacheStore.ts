import { create } from "zustand"
import type { CardGroup, Category, SearchEngine } from "../types"

interface HomeCacheState {
  // 数据缓存
  cardGroups: CardGroup[]
  categories: Category[]
  searchEngines: SearchEngine[]
  hotTags: string[]

  // 状态
  isLoaded: boolean
  isLoading: boolean
  error: string | null
  lastFetchTime: number

  // 用户交互状态（保留滚动位置、展开状态等）
  selectedCategory: string
  collapsedCategories: Set<string>
  searchQuery: string
  scrollPosition: number

  // Actions
  setData: (data: {
    cardGroups: CardGroup[]
    categories: Category[]
    searchEngines: SearchEngine[]
    hotTags: string[]
  }) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedCategory: (id: string) => void
  toggleCollapsedCategory: (id: string) => void
  setSearchQuery: (query: string) => void
  setScrollPosition: (pos: number) => void
  clearCache: () => void

  // 检查缓存是否有效（5分钟内）
  isCacheValid: () => boolean
}

const CACHE_DURATION = 5 * 60 * 1000 // 5分钟

export const useHomeCacheStore = create<HomeCacheState>((set, get) => ({
  cardGroups: [],
  categories: [],
  searchEngines: [],
  hotTags: [],

  isLoaded: false,
  isLoading: false,
  error: null,
  lastFetchTime: 0,

  selectedCategory: "all",
  collapsedCategories: new Set(),
  searchQuery: "",
  scrollPosition: 0,

  setData: (data) => set({
    ...data,
    isLoaded: true,
    isLoading: false,
    error: null,
    lastFetchTime: Date.now(),
  }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),

  setSelectedCategory: (id) => set({ selectedCategory: id }),

  toggleCollapsedCategory: (id) => set((state) => {
    const newSet = new Set(state.collapsedCategories)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    return { collapsedCategories: newSet }
  }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setScrollPosition: (pos) => set({ scrollPosition: pos }),

  clearCache: () => set({
    cardGroups: [],
    categories: [],
    searchEngines: [],
    hotTags: [],
    isLoaded: false,
    lastFetchTime: 0,
  }),

  isCacheValid: () => {
    const { isLoaded, lastFetchTime } = get()
    return isLoaded && (Date.now() - lastFetchTime) < CACHE_DURATION
  },
}))
