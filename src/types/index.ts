// Type definitions for SimpliSave

export interface User {
  id: string
  email: string
  username: string
  createdAt: string
  updatedAt: string
}

export interface Bookmark {
  id: string
  userId: string
  url: string
  title: string
  description: string | null
  favicon: string | null
  categoryId: string | null
  tags: string[]
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface Memo {
  id: string
  userId: string
  title: string
  content: string
  tags: string[]
  categoryId: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  userId: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: string
  userId: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
}

export interface BookmarkState {
  bookmarks: Bookmark[]
  categories: Category[]
  tags: Tag[]
  isLoading: boolean
  error: string | null
}

export interface MemoState {
  memos: Memo[]
  categories: Category[]
  tags: Tag[]
  isLoading: boolean
  error: string | null
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// API request types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface CreateBookmarkRequest {
  url: string
  title: string
  description?: string
  favicon?: string
  categoryId?: string
  tags?: string[]
}

export interface UpdateBookmarkRequest {
  title?: string
  description?: string
  categoryId?: string | null
  tags?: string[]
  archived?: boolean
}

export interface CreateMemoRequest {
  title: string
  content: string
  tags?: string[]
  categoryId?: string
}

export interface UpdateMemoRequest {
  title?: string
  content?: string
  tags?: string[]
  categoryId?: string | null
  archived?: boolean
}

export interface CreateCategoryRequest {
  name: string
  color: string
}

export interface CreateTagRequest {
  name: string
  color: string
}
