import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { publicBookmarkApi, cardGroupApi, userBookmarkApi, memoApi } from "../services/api"
import { X, Search, Globe, FolderOpen, Star, BookOpen, ExternalLink } from "lucide-react"

interface SearchResult {
  type: "bookmark" | "group" | "private" | "memo"
  id: string
  title: string
  url?: string
  description?: string
  icon_url?: string
  slug?: string
}

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const timerRef = useRef<number>()

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const all: SearchResult[] = []

      const [bms, grps] = await Promise.all([
        publicBookmarkApi.list({ q }),
        cardGroupApi.list(),
      ])

      for (const b of (bms || [])) {
        all.push({ type: "bookmark", id: b.id, title: b.title, url: b.url, description: b.description, icon_url: b.icon_url })
      }
      for (const g of (grps || [])) {
        if (g.title.toLowerCase().includes(q.toLowerCase()) || (g.description && g.description.toLowerCase().includes(q.toLowerCase()))) {
          all.push({ type: "group", id: g.id, title: g.title, description: g.description, slug: g.slug, icon_url: g.icon_url })
        }
      }

      if (token) {
        try {
          const [privBms, memos] = await Promise.all([
            userBookmarkApi.list(token, { q }),
            memoApi.list(token),
          ])
          for (const b of (privBms || [])) {
            all.push({ type: "private", id: b.id, title: b.title, url: b.url, description: b.description, icon_url: b.icon_url })
          }
          for (const m of (memos || [])) {
            if (m.title.toLowerCase().includes(q.toLowerCase()) || (m.content || "").toLowerCase().includes(q.toLowerCase())) {
              all.push({ type: "memo", id: m.id, title: m.title, description: m.content?.replace(/<[^>]*>/g, "").slice(0, 120) })
            }
          }
        } catch {}
      }

      setResults(all.slice(0, 20))
      setSelectedIndex(0)
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => doSearch(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, doSearch])

  useEffect(() => {
    if (open) {
      setQuery("")
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); onClose() }
      if (e.key === "Escape" && open) onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  function handleSelect(result: SearchResult) {
    onClose()
    switch (result.type) {
      case "bookmark":
        if (result.url) window.open(result.url, "_blank")
        break
      case "group":
        navigate(`/g/${result.slug}`)
        break
      case "private":
        if (result.url) window.open(result.url, "_blank")
        break
      case "memo":
        navigate("/memos")
        break
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    if (e.key === "Enter" && results[selectedIndex]) { e.preventDefault(); handleSelect(results[selectedIndex]) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("search.placeholder") || "搜索链接、卡片组、备忘录..."}
            className="flex-1 outline-none text-base"
          />
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="text-center py-8 text-gray-400">{t("common.noResults") || "无结果"}</div>
          )}

          {!loading && results.length > 0 && results.map((r, i) => (
            <div key={`${r.type}-${r.id}`}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 last:border-0
                ${i === selectedIndex ? "bg-blue-50" : "hover:bg-gray-50"}`}
              onClick={() => handleSelect(r)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ backgroundColor: r.type === "bookmark" ? "#dbeafe" : r.type === "group" ? "#dcfce7" : r.type === "private" ? "#fef3c7" : "#f3e8ff" }}>
                {r.type === "bookmark" ? <Globe className="w-4 h-4 text-blue-600" /> :
                 r.type === "group" ? <FolderOpen className="w-4 h-4 text-green-600" /> :
                 r.type === "private" ? <Star className="w-4 h-4 text-yellow-600" /> :
                 <BookOpen className="w-4 h-4 text-purple-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900 truncate">{r.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {r.type === "bookmark" ? "公开链接" : r.type === "group" ? "卡片组" : r.type === "private" ? "私有链接" : "备忘录"}
                  </span>
                </div>
                {r.description && <p className="text-xs text-gray-500 truncate mt-0.5">{r.description}</p>}
              </div>
              <ExternalLink className="w-4 h-4 text-gray-300 shrink-0" />
            </div>
          ))}

          {!loading && query && results.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-400 border-t">
              共 {results.length} 条结果 · 上下键导航 · Enter 打开
            </div>
          )}

          {!query && (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p className="mb-2">按 <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Enter</kbd> 搜索全部公开内容</p>
              <p>提示：Ctrl+K 随时打开搜索</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
