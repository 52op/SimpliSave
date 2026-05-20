// Type definitions for SimpliSave
// 接口字段保持 snake_case，前端展示层再做映射与兜底处理

export type ThemeMode = "light" | "dark" | "system"
export type TagList = string[]

export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  bio: string | null
  website: string | null
  github: string | null
  twitter: string | null
  weibo: string | null
  show_bio: number
  show_website: number
  show_github: number
  show_twitter: number
  show_weibo: number
  role?: string
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
  tags: TagList
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
  color: string
  cover_image: string | null
  category_id: string | null
  tags: TagList
  is_pinned: number
  is_public: number
  share_password: string | null
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
  parent_id: string | null
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
  tags: TagList
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
  is_featured: number
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
  loading: boolean
  error: string | null
}

export interface BookmarkState {
  bookmarks: Bookmark[]
  categories: Category[]
  tags: Tag[]
  isLoading: boolean
  error: string | null
  setBookmarks: (bookmarks: Bookmark[]) => void
  setCategories: (categories: Category[]) => void
  setTags: (tags: Tag[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  addBookmark: (bookmark: Bookmark) => void
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void
  removeBookmark: (id: string) => void
  addCategory: (category: Category) => void
  addTag: (tag: Tag) => void
  clearError: () => void
}

export interface MemoState {
  memos: Memo[]
  categories: Category[]
  tags: Tag[]
  isLoading: boolean
  error: string | null
  setMemos: (memos: Memo[]) => void
  setCategories: (categories: Category[]) => void
  setTags: (tags: Tag[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  addMemo: (memo: Memo) => void
  updateMemo: (id: string, updates: Partial<Memo>) => void
  removeMemo: (id: string) => void
  addCategory: (category: Category) => void
  addTag: (tag: Tag) => void
  clearError: () => void
}

export interface SearchEngine {
  id: string
  name: string
  url: string
  param: string
  icon_url: string | null
  color: string
  sort_order: number
  is_site_search: number
  is_active: number
  created_at: string
  updated_at: string
}

export interface ApiResponse<T = unknown> {
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

export interface ImagebedConfig {
  id: string
  name: string
  endpoint: string
  access_key?: string
  secret_key?: string
  bucket: string
  region: string | null
  custom_domain: string | null
  path_template: string
  include_bucket: number
  enabled: number
  is_default: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ImagebedSettings {
  id: string
  icon_max_width: number
  icon_max_height: number
  icon_quality: number
  cover_max_width: number
  cover_max_height: number
  cover_quality: number
  memo_max_width: number
  memo_max_height: number
  memo_quality: number
  avatar_max_width: number
  avatar_max_height: number
  avatar_quality: number
  max_file_size_mb: number
  allowed_formats: string
  convert_to_webp: number
  updated_at: string
}

export type ImageType = 'icon' | 'cover' | 'memo' | 'avatar'

export interface UploadTokenResponse {
  upload_url: string
  public_url: string
  access_key: string
  secret_key: string
  bucket: string
  region: string
  bed_name: string
}

export interface SiteSettings {
  id: string
  site_name: string
  description: string
  keywords: string
  logo_url: string | null
  favicon_url: string | null
  footer_html: string
  ga_id: string | null
  beian: string | null
  custom_head_html: string | null
  created_at: string
  updated_at: string
}
