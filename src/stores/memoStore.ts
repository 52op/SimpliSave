import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MemoState, Memo, Category, Tag } from '../types'

export const useMemoStore = create<MemoState>()(
  persist(
    (set) => ({
      memos: [],
      categories: [],
      tags: [],
      isLoading: false,
      error: null,
      
      setMemos: (memos: Memo[]) => set({ memos }),
      setCategories: (categories: Category[]) => set({ categories }),
      setTags: (tags: Tag[]) => set({ tags }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setError: (error: string | null) => set({ error }),
      
      addMemo: (memo: Memo) => 
        set(state => ({ memos: [...state.memos, memo] })),
        
      updateMemo: (id: string, updates: Partial<Memo>) =>
        set(state => ({
          memos: state.memos.map(m => 
            m.id === id ? { ...m, ...updates } : m
          )
        })),
        
      removeMemo: (id: string) =>
        set(state => ({
          memos: state.memos.filter(m => m.id !== id)
        })),
        
      addCategory: (category: Category) =>
        set(state => ({ categories: [...state.categories, category] })),
        
      addTag: (tag: Tag) =>
        set(state => ({ tags: [...state.tags, tag] })),
        
      clearError: () => set({ error: null })
    }),
    {
      name: 'memo-storage',
      partialize: (state) => ({ 
        memos: state.memos,
        categories: state.categories,
        tags: state.tags
      })
    }
  )
)
