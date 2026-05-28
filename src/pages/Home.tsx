import { useState, useEffect, useRef, useCallback } from "react"
import { useToast } from "../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { useSiteSettingsStore } from "../stores/siteSettingsStore"
import { cardGroupApi, publicCategoryApi, submissionApi, fetchMetaApi, searchEngineApi, hotTagsApi } from "../services/api"
import { CardGroup, Category, SearchEngine } from "../types"
import { Search, Folder, Globe, Zap, Loader2, X } from "lucide-react"
import Favicon from "../components/Favicon"
import EmptyState from "../components/EmptyState"
import PageHeader from "../components/PageHeader"
import Modal from "../components/Modal"
import { useNavigate } from "react-router-dom"
import { pinyinMatch } from "../utils/pinyin"

const STORAGE_KEY = "preferredEngineId"
const MAX_TAGS = 12
const ROTATE_INTERVAL = 3000

function jsonp(url: string, callbackName: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const cb = `_jsonp_${callbackName}_${Date.now()}`
    ;(window as any)[cb] = (data: any) => {
      cleanup()
      resolve(data.s || [])
    }
    const script = document.createElement("script")
    script.src = `${url}&cb=${cb}`
    script.onerror = () => { cleanup(); reject(new Error("jsonp failed")) }
    const cleanup = () => {
      delete (window as any)[cb]
      if (script.parentNode) script.parentNode.removeChild(script)
    }
    document.head.appendChild(script)
  })
}

async function fetchSuggestions(query: string): Promise<string[]> {
  const response = await fetch(`https://www.baidu.com/sugrec?prod=pc&wd=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error("suggest failed")
  const data = await response.json()
  if (Array.isArray(data?.g)) {
    return data.g.map((item: { q?: string }) => item.q || "").filter(Boolean)
  }
  return []
}

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const siteSettings = useSiteSettingsStore((s) => s.settings)
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [cardGroups, setCardGroups] = useState<CardGroup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [engines, setSearchEngines] = useState<SearchEngine[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEngineId, setSelectedEngineId] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showEngines, setShowEngines] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitForm, setSubmitForm] = useState({ url: "", title: "", description: "" })
  const [submitting, setSubmitting] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [hotTags, setHotTags] = useState<string[]>([])
  const [pageError, setPageError] = useState("")
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [placeholderVisible, setPlaceholderVisible] = useState(true)
  const engineRef = useRef<HTMLDivElement>(null)
  const suggestRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const tagTimerRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    loadData()
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setSelectedEngineId(saved)
  }, [])

  useEffect(() => {
    if (!showEngines) return
    const handler = (e: MouseEvent) => {
      if (engineRef.current && !engineRef.current.contains(e.target as Node)) {
        setShowEngines(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showEngines])

  useEffect(() => {
    if (!showSuggestions) return
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showSuggestions])

  const displayTags = hotTags.slice(0, MAX_TAGS)

  useEffect(() => {
    if (displayTags.length <= 1) return
    tagTimerRef.current = setInterval(() => {
      setPlaceholderVisible(false)
      setTimeout(() => {
        setPlaceholderIndex(i => (i + 1) % displayTags.length)
        setPlaceholderVisible(true)
      }, 300)
    }, ROTATE_INTERVAL)
    return () => clearInterval(tagTimerRef.current)
  }, [displayTags.length])

  const currentPlaceholder = displayTags.length > 0
    ? displayTags[placeholderIndex % displayTags.length]
    : `${t("home.searchIn")} ${selectedEngine?.name || ""}`

  const doSuggest = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); setShowSuggestions(false); return }
    try {
      const words = await fetchSuggestions(q)
      setSuggestions(words)
      setShowSuggestions(words.length > 0)
    } catch {
      try {
        const words = await jsonp(`https://suggestion.baidu.com/su?wd=${encodeURIComponent(q)}`, "baidu")
        setSuggestions(words)
        setShowSuggestions(words.length > 0)
      } catch {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearchQuery(val)
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    suggestTimerRef.current = setTimeout(() => doSuggest(val), 80)
  }

  function handleSuggestionClick(word: string) {
    setSearchQuery(word)
    setShowSuggestions(false)
    setSuggestions([])
    inputRef.current?.focus()
  }

  function handleSuggestionKeyDown(e: React.KeyboardEvent, word: string) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSuggestionClick(word)
      handleSearchDirect(word)
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      const q = searchQuery.trim()
      if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
    }
  }

  function handleSearchDirect(query?: string) {
    const q = (query || searchQuery || currentPlaceholder).trim()
    if (!q || !selectedEngine) return
    setShowSuggestions(false)
    if (selectedEngine.is_site_search) {
      navigate(`/search?q=${encodeURIComponent(q)}`)
    } else {
      const url = `${selectedEngine.url}?${selectedEngine.param}=${encodeURIComponent(q)}`
      window.open(url, "_blank")
    }
  }

  async function loadData() {
    setLoading(true)
    try {
      const [groups, cats, engs, tags] = await Promise.all([
        cardGroupApi.list(),
        publicCategoryApi.list(),
        searchEngineApi.list(true),
        hotTagsApi.list().catch(() => [] as string[]),
      ])
      setCardGroups(groups)
      setCategories(cats)
      setSearchEngines(engs)
      setHotTags(tags)
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setLoading(false)
    }
  }

  const selectedEngine = engines.find(e => e.id === selectedEngineId) || engines[0]

  const filteredGroups = cardGroups.filter((g) => {
    const matchesSearch = !searchQuery ||
      pinyinMatch(g.title, searchQuery) ||
      (g.description && pinyinMatch(g.description, searchQuery))
    const matchesCategory = selectedCategory === "all" || g.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedGroups = filteredGroups.reduce((acc, g) => {
    const catId = g.category_id || "uncategorized"
    if (!acc[catId]) acc[catId] = []
    acc[catId].push(g)
    return acc
  }, {} as Record<string, CardGroup[]>)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    handleSearchDirect()
  }

  const featuredGroups = cardGroups.filter(g => g.is_featured)
  const topGroups = featuredGroups.length > 0
    ? featuredGroups
    : [...cardGroups].sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0)).slice(0, 12)

  async function handleSubmitLink() {
    if (!token) { toast(t("common.loginRequired") || "请先登录"); return }
    if (!submitForm.url.trim() || !submitForm.title.trim()) return
    setSubmitting(true)
    try {
      await submissionApi.create(token, submitForm)
      toast(t("home.submitSuccess") || "提交成功！等待管理员审核", "success")
      setShowSubmitModal(false)
      setSubmitForm({ url: "", title: "", description: "" })
    } catch (err: any) {
      toast(err.message || t("home.submitFailed") || "提交失败", "error")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFetchMeta() {
    if (!submitForm.url.trim()) return
    setFetching(true)
    try {
      const meta = await fetchMetaApi.fetch(submitForm.url)
      setSubmitForm(prev => ({
        ...prev,
        title: meta.title || prev.title,
        description: meta.description || prev.description,
      }))
    } catch (err: any) {
      toast(t("home.fetchFailed") + (err.message || t("home.fillManually")) || "抓取失败", "error")
    } finally {
      setFetching(false)
    }
  }

  const handleSelectEngine = (engine: SearchEngine) => {
    setSelectedEngineId(engine.id)
    localStorage.setItem(STORAGE_KEY, engine.id)
    setShowEngines(false)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
      <PageHeader title={siteSettings?.site_name || "SimpliSave"} description={siteSettings?.description || "集中管理常用网址、公开导航与快速搜索，打造更清爽高效个人工作台。"} />
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">{t("common.loading")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto dark:text-gray-300">
      {/* 搜索区域 */}
      <div className="ui-card text-center py-10 px-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">{siteSettings?.site_name || "SimpliSave"}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">{siteSettings?.description || t("app.description")}</p>
        
        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative" ref={suggestRef}>
          <div className="flex items-stretch rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="relative" ref={engineRef}>
              <button
                type="button"
                onClick={() => setShowEngines(!showEngines)}
                className="flex h-full sm:min-w-[112px] items-center gap-1 sm:gap-2 rounded-l-xl border-r border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 sm:px-4 py-3 hover:bg-[var(--color-surface-muted)]"
              >
                {selectedEngine?.icon_url && <img src={selectedEngine.icon_url} alt="" className="w-4 h-4" />}
                <span className="hidden sm:inline text-sm font-medium dark:text-gray-200">{selectedEngine?.name || t("home.search")}</span>
              </button>
              {showEngines && (
                <div className="absolute left-0 top-full z-50 mt-2 max-h-64 min-w-full overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
                  {engines.map((engine) => (
                    <button
                      key={engine.id}
                      type="button"
                      onClick={() => handleSelectEngine(engine)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 whitespace-nowrap dark:text-gray-200"
                    >
                      {engine.icon_url && <img src={engine.icon_url} alt="" className="w-4 h-4" />}
                      <span>{engine.name}</span>
                      {!!engine.is_site_search && <span className="text-xs text-blue-500 ml-1">{t("home.siteSearch")}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={currentPlaceholder}
              className={`min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[var(--color-text-main)] outline-none focus:ring-0 transition-opacity duration-300 ${placeholderVisible ? "placeholder:opacity-100" : "placeholder:opacity-0"}`}
              autoComplete="off"
            />
            <button
              type="submit"
              className="flex sm:min-w-[108px] items-center justify-center gap-1 sm:gap-2 rounded-r-xl bg-blue-600 px-3 sm:px-6 py-3 text-white hover:bg-blue-700"
            >
              <Search className="w-5 h-5" />
              <span className="hidden sm:inline">{t("home.search")}</span>
            </button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg z-50 overflow-hidden">
              {suggestions.map((word, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestionClick(word)}
                  onKeyDown={(e) => handleSuggestionKeyDown(e, word)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm dark:text-gray-200 flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>{word}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setShowSuggestions(false); navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`) }}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2 border-t border-[var(--color-border)]"
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>在站内搜索 "{searchQuery}"</span>
              </button>
            </div>
          )}
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => { setShowSuggestions(false); navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`) }}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              在站内搜索 "{searchQuery}"
            </button>
          )}
        </form>
      </div>

      {/* 常用推荐 */}
      {topGroups.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("home.recommended")}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {topGroups.map((g) => (
              <a
                key={g.id}
                href={`/g/${g.slug}`}
                onClick={(e) => { e.preventDefault(); navigate(`/g/${g.slug}`) }}
                className="ui-card p-3 flex items-center gap-2.5 hover:shadow-md transition-shadow group"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-[var(--color-surface-2)] flex items-center justify-center">
                  <Favicon src={g.icon_url} title={g.title} size="md" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-main)] truncate group-hover:text-[var(--color-primary)] transition-colors" title={g.title}>{g.title}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 分类导航 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("home.categories")}</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {t("home.all")}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === c.id
                  ? "text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
              style={selectedCategory === c.id ? { backgroundColor: c.color } : {}}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* 卡片组列表 */}
      {Object.keys(groupedGroups).length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30">
          <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">{t("home.noGroups")}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("home.loginToAdd")}</p>
        </div>
      ) : pageError ? (
        <EmptyState title="加载失败" description={pageError} tone="error" />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedGroups).map(([catId, items]) => {
            const category = categories.find(c => c.id === catId)
            const catName = category?.name || (catId === "uncategorized" ? t("home.uncategorized") || "未分类" : t("home.other") || "其他")
            const catColor = category?.color || "#3b82f6"

            return (
              <div key={catId}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-1 h-6 rounded"
                    style={{ backgroundColor: catColor }}
                  />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    {category?.icon && (
                      <span className="w-5 h-5 flex items-center justify-center overflow-hidden [&_svg]:max-w-full [&_svg]:max-h-full" dangerouslySetInnerHTML={{ __html: category.icon.startsWith('<svg') ? category.icon : '' }} />
                    )}
                    {category?.icon && !category.icon.startsWith('<svg') && (
                      <img src={category.icon} alt="" className="w-5 h-5 object-contain" />
                    )}
                    {catName}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map((g) => (
                    <a
                      key={g.id}
                      href={`/g/${g.slug}`}
                      onClick={(e) => { e.preventDefault(); navigate(`/g/${g.slug}`) }}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/30 p-4 hover:shadow-lg transition group border-l-4 border-l-transparent hover:[border-left-color:var(--cat-color)]"
                      style={{ '--cat-color': catColor } as React.CSSProperties}
                    >
                      <div className="flex items-start gap-3">
                        <Favicon src={g.icon_url} title={g.title} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600">{g.title}</p>
                          {g.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{g.description}</p>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 提交链接 Modal */}
      <Modal show={showSubmitModal} title={t("home.submitLink")} onClose={() => setShowSubmitModal(false)} widthClass="max-w-lg">
        <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.url")}</label>
                <div className="flex gap-2">
                  <input type="url" value={submitForm.url}
                    onChange={(e) => setSubmitForm({ ...submitForm, url: e.target.value })}
                    placeholder="https://example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button onClick={handleFetchMeta} disabled={fetching || !submitForm.url.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                    {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {fetching ? t("home.fetching") : t("home.fetch")}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.title")}</label>
                <input type="text" value={submitForm.title}
                  onChange={(e) => setSubmitForm({ ...submitForm, title: e.target.value })}
                  placeholder={t("bookmarks.titlePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.description")}</label>
                <textarea value={submitForm.description}
                  onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
                  placeholder={t("bookmarks.descriptionPlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowSubmitModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">{t("common.cancel")}</button>
                <button onClick={handleSubmitLink} disabled={submitting || !submitForm.url || !submitForm.title}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? t("home.submitting") : t("home.submit")}
                </button>
              </div>
        </div>
      </Modal>
    </div>
  )
}
