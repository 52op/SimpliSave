import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BookmarkState, Bookmark, Category, Tag } from '../types'

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set) => ({
      bookmarks: [],
      categories: [],
      tags: [],
      isLoading: false,
      error: null,
      
      setBookmarks: (bookmarks: Bookmark[]) => set({ bookmarks }),
      setCategories: (categories: Category[]) => set({ categories }),
      setTags: (tags: Tag[]) => set({ tags }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setError: (error: string | null) => set({ error }),
      
      addBookmark: (bookmark: Bookmark) => 
        set(state => ({ bookmarks: [...state.bookmarks, bookmark] })),
        
      updateBookmark: (id: string, updates: Partial<Bookmark>) =>
        set(state => ({
          bookmarks: state.bookmarks.map(b => 
            b.id === id ? { ...b, ...updates } : b
          )
        })),
        
      removeBookmark: (id: string) =>
        set(state => ({
          bookmarks: state.bookmarks.filter(b => b.id !== id)
        })),
        
      addCategory: (category: Category) =>
        set(state => ({ categories: [...state.categories, category] })),
        
      addTag: (tag: Tag) =>
        set(state => ({ tags: [...state.tags, tag] })),
        
      clearError: () => set({ error: null })
    }),
    {
      name: 'bookmark-storage',
      partialize: (state) => ({ 
        bookmarks: state.bookmarks,
        categories: state.categories,
        tags: state.tags
      })
    }
  )
)
