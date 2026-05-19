import type { Bookmark, Memo, PublicBookmark, TagList, User } from "../types"

function parseTagList(value: unknown): TagList {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean)
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

export function normalizeBookmark(bookmark: Bookmark): Bookmark {
  return { ...bookmark, tags: parseTagList(bookmark.tags) }
}

export function normalizePublicBookmark(bookmark: PublicBookmark): PublicBookmark {
  return { ...bookmark, tags: parseTagList(bookmark.tags) }
}

export function normalizeMemo(memo: Memo): Memo {
  return { ...memo, tags: parseTagList(memo.tags) }
}

export function normalizeUser(user: Partial<User> | null | undefined): User | null {
  if (!user?.id || !user.email || !user.name) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url ?? null,
    bio: user.bio ?? null,
    website: user.website ?? null,
    github: user.github ?? null,
    twitter: user.twitter ?? null,
    weibo: user.weibo ?? null,
    show_bio: user.show_bio ?? 1,
    show_website: user.show_website ?? 1,
    show_github: user.show_github ?? 1,
    show_twitter: user.show_twitter ?? 1,
    show_weibo: user.show_weibo ?? 1,
    role: user.role,
    created_at: user.created_at ?? "",
    updated_at: user.updated_at ?? user.created_at ?? "",
  }
}

export function serializeTags(tags: TagList | string | undefined): TagList {
  if (Array.isArray(tags)) return tags.map((item) => item.trim()).filter(Boolean)
  if (typeof tags === "string") return tags.split(",").map((item) => item.trim()).filter(Boolean)
  return []
}
