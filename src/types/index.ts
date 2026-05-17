// Type definitions for SimpliSave
// 注意：字段名使用 snake_case 与数据库/后端保持一致

export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  url: string
  title: string
  description: string | null
  icon_url: string | null
  category_id: string | null
  tags: string | string[]
  is_favorite: number
  visit_count: number
  is_public: number
  archived: number
  created_at: string
  updated_at: string
}

export interface Memo {
  id: string
  user_id: string
  title: string
  content: string
  is_pinned: number
  color: string
  cover_image: string | null
  category_id: string | null
  tags: string | string[]
  is_public: number
  archived: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string | null
  color: string
  sort_order: number
  type: 'bookmark' | 'memo'
  created_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  type: 'bookmark' | 'memo'
  color: string
  created_at: string
}

export interface Submission {
  id: string
  user_id: string
  url: string
  title: string
  description: string | null
  icon_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
  updated_at: string
}

export interface PublicBookmark {
  id: string
  title: string
  url: string
  description: string | null
  icon_url: string | null
  group_id: string | null
  group_title: string | null
  category_id: string | null
  tags: string | string[]
  sort_order: number
  status: string
  visit_count: number
  created_by: string | null
  created_at: string
  updated_at: string
  category_name?: string | null
  category_color?: string | null
}

export interface CardGroup {
  id: string
  title: string
  slug: string
  description: string | null
  icon_url: string | null
  category_id: string | null
  category_name: string | null
  category_color: string | null
  sort_order: number
  status: string
  source_submission_id: string | null
  visit_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CardGroupDetail extends CardGroup {
  bookmarks: PublicBookmark[]
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

export interface FetchMetaResult {
  title: string
  description: string
  icon: string
  url: string
}
