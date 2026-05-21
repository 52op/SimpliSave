import { match } from 'pinyin-pro'

export function pinyinMatch(text: string, query: string): boolean {
  if (!query) return true
  if (!text) return false
  const q = query.toLowerCase()
  if (text.toLowerCase().includes(q)) return true
  try {
    return !!match(text, query, { continuous: true })
  } catch {
    return false
  }
}
