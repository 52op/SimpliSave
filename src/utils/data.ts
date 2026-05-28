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

function md5(s: string): string {
  const hex = (v: number) => (v < 16 ? '0' : '') + v.toString(16)
  const add = (x: number, y: number) => (x + y) & 0xFFFFFFFF
  const bit = (n: number, i: number) => (n >>> i) & 1
  const rol = (n: number, b: number) => (n << b) | (n >>> (32 - b))
  const cmn = (q: number, a: number, b: number, x: number, s: number, t: number) => add(rol(add(add(a, q), add(x, t)), s), b)
  const ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn((b & c) | (~b & d), a, b, x, s, t)
  const gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn((b & d) | (c & ~d), a, b, x, s, t)
  const hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn(b ^ c ^ d, a, b, x, s, t)
  const ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn(c ^ (b | ~d), a, b, x, s, t)
  let i = 0, a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476
  const str = unescape(encodeURIComponent(s))
  const len = str.length
  const words: number[] = []
  for (i = 0; i < len; i++) words[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8)
  words[len >> 2] |= 0x80 << ((len % 4) * 8)
  words[((len + 8) >> 6) * 16 + 14] = len * 8
  for (let block = 0; block < words.length; block += 16) {
    let A = a, B = b, C = c, D = d
    for (i = 0; i < 64; i++) {
      const fns = [ff, gg, hh, ii]
      const s = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
      const t = [0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391]
      const g = i < 16 ? i : i < 32 ? (5 * i + 1) % 16 : i < 48 ? (3 * i + 5) % 16 : (7 * i) % 16
      const fn = fns[i >> 4]
      const oldA = A
      A = D
      D = C
      C = B
      B = add(B, fn(A, oldA, B, C, words[block + g], s[(i >> 3 << 1) + (i & 3) + ((i >> 4) << 3)], t[i]))
    }
    a = add(a, A); b = add(b, B); c = add(c, C); d = add(d, D)
  }
  return hex(a) + hex(b) + hex(c) + hex(d)
}

export function getAvatarUrl(avatarUrl: string | null | undefined, email: string, size: number = 80): string {
  if (avatarUrl) return avatarUrl
  const hash = md5((email || '').trim().toLowerCase())
  return `https://cn.cravatar.com/avatar/${hash}?s=${size}&d=Monsterid`
}
