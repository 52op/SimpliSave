import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useToast } from "../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { useMemoStore } from "../stores/memoStore"
import { memoApi, userCategoryApi, tagApi } from "../services/api"
import { Plus, Search, Trash2, Edit2, Pin, PinOff, Globe, Lock, Eye, FileText, Folder } from "lucide-react"
import Modal from "../components/Modal"
import MemoForm, { type MemoFormData } from "../components/MemoForm"
import EmptyState from "../components/EmptyState"
import PageHeader from "../components/PageHeader"
import SectionCard from "../components/SectionCard"
import FilterBar from "../components/FilterBar"
import { pinyinMatch } from "../utils/pinyin"

function stripHtml(html: string): string {
  const div = document.createElement("div")
  div.innerHTML = html
  return div.textContent || div.innerText || ""
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getTimelineLabel(dateStr: string): { key: string; label: string } {
  const d = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const dayOfWeek = todayStart.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(todayStart.getTime() - mondayOffset * 86400000)

  if (d >= todayStart) return { key: "today", label: "timelineToday" }
  if (d >= yesterdayStart) return { key: "yesterday", label: "timelineYesterday" }
  if (d >= weekStart) return { key: "week", label: "timelineWeek" }
  return {
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    label: "timelineYearMonth",
  }
}

function isInTimeRange(dateStr: string, filter: string): boolean {
  if (filter === "all") return true
  const d = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (filter) {
    case "today": return d >= todayStart
    case "7days": return d >= new Date(todayStart.getTime() - 6 * 86400000)
    case "month": return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    case "year": return d.getFullYear() === now.getFullYear()
    default: return true
  }
}

const TIME_FILTERS: { value: string; labelKey: string }[] = [
  { value: "all", labelKey: "memos.filterAll" },
  { value: "today", labelKey: "memos.filterToday" },
  { value: "7days", labelKey: "memos.filter7Days" },
  { value: "month", labelKey: "memos.filterMonth" },
  { value: "year", labelKey: "memos.filterYear" },
]

export default function Memos() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const { memos, categories, tags, setMemos, setCategories, setTags, addMemo, updateMemo, removeMemo, addCategory } = useMemoStore()
  const { toast, confirm } = useToast()

  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingMemo, setEditingMemo] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [timeFilter, setTimeFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [pageError, setPageError] = useState("")

  const [categoryNameState, setCategoryNameState] = useState("")
  const [categoryColorState, setCategoryColorState] = useState("#3b82f6")

  useEffect(() => { loadData() }, [])

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      const [memoRes, catRes, tagRes] = await Promise.all([
        memoApi.list(token),
        userCategoryApi.list(token),
        tagApi.list(token, "memo"),
      ])
      setMemos(memoRes)
      setCategories(catRes)
      setTags(tagRes)
      setPageError("")
    } catch (err: any) {
      setPageError(err?.message || t("memos.loadFailed"))
      toast(err?.message || t("memos.loadFailed"), "error")
    } finally {
      setLoading(false)
    }
  }

  const filteredMemos = memos
    .filter((m) => {
      const matchesSearch = !searchQuery || pinyinMatch(m.title, searchQuery) || pinyinMatch(stripHtml(m.content || ""), searchQuery)
      const matchesCategory = selectedCategory === "all" || m.category_id === selectedCategory
      const matchesPinned = !showPinnedOnly || !!m.is_pinned
      const matchesTime = isInTimeRange(m.created_at, timeFilter)
      const mDate = m.created_at.slice(0, 10)
      const matchesDateRange = !dateRange.start || !dateRange.end || (mDate >= dateRange.start && mDate <= dateRange.end)
      return matchesSearch && matchesCategory && matchesPinned && matchesTime && matchesDateRange
    })
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const groupedMemos: { key: string; labelKey: string; year?: number; month?: number; items: typeof memos }[] = []
  const groupMap = new Map<string, typeof groupedMemos[0]>()
  for (const m of filteredMemos) {
    const { key, label } = getTimelineLabel(m.created_at)
    let group = groupMap.get(key)
    if (!group) {
      group = { key, labelKey: label, items: [] }
      if (label === "timelineYearMonth") {
        const d = new Date(m.created_at)
        group.year = d.getFullYear()
        group.month = d.getMonth() + 1
      }
      groupMap.set(key, group)
      groupedMemos.push(group)
    }
    group.items.push(m)
  }

  async function handleAddSave(data: MemoFormData) {
    if (!token) return
    try {
      const res = await memoApi.create(token, data)
      addMemo(res)
      setShowAddModal(false)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
      throw err
    }
  }

  async function handleUpdateSave(data: MemoFormData) {
    if (!token || !editingMemo) return
    try {
      const res = await memoApi.update(token, editingMemo.id, data)
      updateMemo(editingMemo.id, res)
      setShowEditModal(false)
      setEditingMemo(null)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
      throw err
    }
  }

  async function handleDeleteMemo(id: string) {
    if (!token || !await confirm(t("memos.deleteConfirm"))) return
    try {
      await memoApi.delete(token, id)
      removeMemo(id)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handlePinMemo(id: string) {
    if (!token) return
    try {
      const res = await memoApi.pin(token, id)
      updateMemo(id, { is_pinned: res.is_pinned })
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleAddCategory() {
    if (!token || !categoryNameState.trim()) return
    try {
      const res = await userCategoryApi.create(token, { name: categoryNameState.trim(), color: categoryColorState, type: "memo" })
      addCategory(res)
      setShowCategoryModal(false)
      setCategoryNameState("")
      setCategoryColorState("#3b82f6")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title={t("memos.title")} description={t("memos.pageDesc")} />

      <SectionCard className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex gap-2">
            <button onClick={() => setShowCategoryModal(true)} className="ui-btn ui-btn-ghost">
              <Folder className="w-4 h-4" />{t("categories.add")}
            </button>
            <button onClick={() => setShowAddModal(true)} className="ui-btn ui-btn-primary">
              <Plus className="w-4 h-4" />{t("memos.add")}
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="mb-6">
        <FilterBar className="items-stretch">
          <div className="relative min-w-0 w-full lg:basis-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input type="text" placeholder={t("memos.search")} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ui-input h-11 w-full pl-10 pr-4" />
          </div>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
            className="ui-select h-11 w-full px-4 sm:w-auto sm:min-w-[180px]">
            <option value="all">{t("bookmarks.allCategories")}</option>
            {categories.filter(c => c.type === "memo").map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button onClick={() => setShowPinnedOnly((prev) => !prev)} className={`${showPinnedOnly ? "ui-btn ui-btn-primary" : "ui-btn ui-btn-ghost"} h-11 w-full sm:w-auto`}>
            {t("memos.pinnedOnly")}
          </button>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="ui-input h-11 px-2 text-sm w-full sm:w-[140px]" />
            <span className="text-gray-400 text-sm flex-shrink-0">—</span>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="ui-input h-11 px-2 text-sm w-full sm:w-[140px]" />
            {(dateRange.start || dateRange.end) && (
              <button onClick={() => setDateRange({ start: "", end: "" })} className="text-gray-400 hover:text-red-500 flex-shrink-0 p-1">×</button>
            )}
          </div>
        </FilterBar>
        <div className="flex gap-2 mt-3 flex-wrap">
          {TIME_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setTimeFilter(f.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${timeFilter === f.value ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </SectionCard>

      {pageError ? (
        <EmptyState title={t("common.error")} description={pageError} tone="error" />
      ) : null}

      {!pageError && filteredMemos.length === 0 ? (
        <EmptyState
          title={searchQuery || selectedCategory !== "all" || showPinnedOnly || timeFilter !== "all" || dateRange.start || dateRange.end ? t("memos.noMatchTitle") : t("memos.noMemos")}
          description={searchQuery || selectedCategory !== "all" || showPinnedOnly || timeFilter !== "all" || dateRange.start || dateRange.end ? t("memos.noMatchDesc") : t("memos.pageDesc")}
          icon={<FileText className="w-6 h-6" />}
          action={!searchQuery && selectedCategory === "all" && !showPinnedOnly && timeFilter === "all" && !dateRange.start && !dateRange.end ? <button onClick={() => setShowAddModal(true)} className="ui-btn ui-btn-primary">{t("memos.addFirst")}</button> : undefined}
        />
      ) : !pageError ? (
        <div className="space-y-8">
          {groupedMemos.map((group) => (
            <div key={group.key}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                {group.labelKey === "timelineYearMonth"
                  ? t("memos.timelineYearMonth", { year: group.year, month: String(group.month).padStart(2, "0") })
                  : t(`memos.${group.labelKey}`)}
              </h3>
              <div className="space-y-3">
                {group.items.map((m) => {
                  const tagsArr = typeof m.tags === "string" ? JSON.parse(m.tags || "[]") : (m.tags || [])
                  return (
                    <div key={m.id} className="rounded-lg shadow-md dark:shadow-gray-900/30 hover:shadow-lg transition border-l-4 overflow-hidden"
                      style={{ borderLeftColor: m.color || "#e5e7eb", backgroundColor: m.color === "#ffffff" ? "#fff" : m.color + "15" }}>
                      {m.cover_image && (
                        <button onClick={() => navigate(`/memo/${m.id}`)} className="block w-full">
                          <img src={m.cover_image} alt="" className="w-full h-32 object-cover" />
                        </button>
                      )}
                      <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button onClick={() => handlePinMemo(m.id)} className="text-gray-400 dark:text-gray-500 hover:text-yellow-500 flex-shrink-0">
                            {m.is_pinned ? <Pin className="w-4 h-4 fill-current text-yellow-500" /> : <PinOff className="w-4 h-4" />}
                          </button>
                          {m.is_pinned && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded flex-shrink-0">{t("memos.pinned")}</span>}
                          {m.is_public ? (
                            <span className="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded flex-shrink-0 flex items-center gap-1">
                              {m.share_password ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                              {t("memos.public")}
                            </span>
                          ) : null}
                          <div className="flex-1 min-w-0">
                            <button onClick={() => navigate(`/memo/${m.id}`)} className="text-left w-full">
                              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate hover:text-blue-600">{m.title}</h3>
                            </button>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {m.category_id && (
                                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                  {categories.find(c => c.id === m.category_id)?.name || t("common.noCategory")}
                                </span>
                              )}
                              {tagsArr.slice(0, 3).map((tag: string, i: number) => (
                                <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded">#{tag}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => navigate(`/memo/${m.id}`)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600" title={t("common.view")}><Eye className="w-4 h-4" /></button>
                            <button onClick={() => { setEditingMemo(m); setShowEditModal(true) }} className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteMemo(m.id)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                      {m.content && (
                        <button onClick={() => navigate(`/memo/${m.id}`)} className="text-left w-full">
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{stripHtml(m.content)}</p>
                        </button>
                      )}
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {formatDateKey(m.created_at, t)}
                      </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Modal show={showAddModal} title={t("memos.add")} onClose={() => { setShowAddModal(false) }} fullScreen>
        {token && <MemoForm token={token} categories={categories} onSave={handleAddSave} onCancel={() => setShowAddModal(false)} />}
      </Modal>

      <Modal show={showEditModal} title={t("memos.edit")} onClose={() => { setShowEditModal(false); setEditingMemo(null) }} fullScreen>
        {token && editingMemo && (
          <MemoForm
            token={token}
            categories={categories}
            initialData={{
              title: editingMemo.title,
              content: editingMemo.content,
              color: editingMemo.color,
              cover_image: editingMemo.cover_image,
              category_id: editingMemo.category_id,
              tags: editingMemo.tags,
              is_public: editingMemo.is_public,
              share_password: editingMemo.share_password,
            }}
            onSave={handleUpdateSave}
            onCancel={() => { setShowEditModal(false); setEditingMemo(null) }}
          />
        )}
      </Modal>

      <Modal show={showCategoryModal} title={t("categories.add")} onClose={() => setShowCategoryModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("categories.name")}</label>
            <input type="text" value={categoryNameState} onChange={(e) => setCategoryNameState(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("categories.color")}</label>
            <input type="color" value={categoryColorState} onChange={(e) => setCategoryColorState(e.target.value)}
              className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg" />
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => setShowCategoryModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button>
            <button onClick={handleAddCategory} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function formatDateKey(dateStr: string, t: (key: string, opts?: any) => string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((todayStart.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 1) return t("bookmarks.yesterday")
  if (diffDays < 7) return t("bookmarks.daysAgo", { days: diffDays })
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return t("bookmarks.weeksAgo", { weeks: diffWeeks })
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return t("bookmarks.monthsAgo", { months: diffMonths })
  return d.toLocaleDateString()
}
