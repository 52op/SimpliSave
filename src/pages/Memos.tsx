import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useToast } from "../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { useMemoStore } from "../stores/memoStore"
import { memoApi, userCategoryApi, tagApi } from "../services/api"
import { Plus, Search, Trash2, Edit2, Pin, PinOff, Globe, Lock, Eye, FileText, Folder, Tag, Settings, Check, X } from "lucide-react"
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
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
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
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayOfWeek = todayStart.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const thisMonday = new Date(todayStart.getTime() - mondayOffset * 86400000)
  switch (filter) {
    case "today": return d >= todayStart
    case "7days": return d >= new Date(todayStart.getTime() - 6 * 86400000)
    case "lastWeek": {
      const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000)
      return d >= lastMonday && d < thisMonday
    }
    case "month": return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    case "lastMonth": {
      let lastMonth = now.getMonth() - 1
      let lastMonthYear = now.getFullYear()
      if (lastMonth < 0) { lastMonth = 11; lastMonthYear-- }
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
    }
    case "year": return d.getFullYear() === now.getFullYear()
    default: return true
  }
}

const TIME_FILTERS: { value: string; labelKey: string }[] = [
  { value: "all", labelKey: "memos.filterAll" },
  { value: "today", labelKey: "memos.filterToday" },
  { value: "7days", labelKey: "memos.filter7Days" },
  { value: "lastWeek", labelKey: "memos.filterLastWeek" },
  { value: "month", labelKey: "memos.filterMonth" },
  { value: "lastMonth", labelKey: "memos.filterLastMonth" },
  { value: "year", labelKey: "memos.filterYear" },
]

export default function Memos() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const { memos, categories, tags, setMemos, setCategories, setTags, addMemo, updateMemo, removeMemo, addCategory, updateCategory, removeCategory } = useMemoStore()
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
  const [selectedTag, setSelectedTag] = useState<string>("")
  const [showTagCloud, setShowTagCloud] = useState(false)

  const [categoryNameState, setCategoryNameState] = useState("")
  const [categoryColorState, setCategoryColorState] = useState("#3b82f6")
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState("")
  const [editCategoryColor, setEditCategoryColor] = useState("#3b82f6")
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const tagParam = searchParams.get("tag")
    if (tagParam) setSelectedTag(tagParam)
  }, [])

  useEffect(() => {
    if (selectedTag) {
      setSearchParams({ tag: selectedTag }, { replace: true })
    } else {
      if (searchParams.get("tag")) setSearchParams({}, { replace: true })
    }
  }, [selectedTag])

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
      const tagsArr = typeof m.tags === "string" ? JSON.parse(m.tags || "[]") : (m.tags || [])
      const matchesTag = !selectedTag || tagsArr.includes(selectedTag)
      return matchesSearch && matchesCategory && matchesPinned && matchesTime && matchesDateRange && matchesTag
    })
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned
      const aDate = new Date(a.created_at.endsWith('Z') ? a.created_at : a.created_at + 'Z')
      const bDate = new Date(b.created_at.endsWith('Z') ? b.created_at : b.created_at + 'Z')
      return bDate.getTime() - aDate.getTime()
    })

  const groupedMemos: { key: string; labelKey: string; year?: number; month?: number; items: typeof memos }[] = []
  const groupMap = new Map<string, typeof groupedMemos[0]>()
  for (const m of filteredMemos) {
    const { key, label } = getTimelineLabel(m.created_at)
    let group = groupMap.get(key)
    if (!group) {
      group = { key, labelKey: label, items: [] }
      if (label === "timelineYearMonth") {
        const d = new Date(m.created_at.endsWith('Z') ? m.created_at : m.created_at + 'Z')
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
      setCategoryNameState("")
      setCategoryColorState("#3b82f6")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleUpdateCategory(id: string, data: { name: string; color: string }) {
    if (!token) return
    try {
      const res = await userCategoryApi.update(token, id, data)
      updateCategory(id, res)
      setEditingCategoryId(null)
      setEditCategoryName("")
      setEditCategoryColor("#3b82f6")
      toast(t("categories.edit") + " ✓", "success")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!token) return
    const ok = await confirm(t("categories.deleteConfirm"))
    if (!ok) return
    try {
      await userCategoryApi.delete(token, id)
      removeCategory(id)
      toast(t("categories.delete") + " ✓", "success")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  function renderMemoCard(m: typeof memos[0]) {
    const tagsArr = typeof m.tags === "string" ? JSON.parse(m.tags || "[]") : (m.tags || [])
    return (
      <div key={m.id} className="rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700/50 overflow-hidden">
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
                    <button key={i} onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                      className={`text-xs px-2 py-0.5 rounded ${selectedTag === tag ? "bg-blue-600 text-white" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"}`}>#{tag}</button>
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
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input type="text" placeholder={t("memos.search")} value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ui-input h-11 w-full pl-10 pr-4" />
            </div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="ui-select h-11 px-4 sm:w-auto sm:min-w-[160px]">
              <option value="all">{t("bookmarks.allCategories")}</option>
              {categories.filter(c => c.type === "memo").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={() => setShowCategoryModal(true)}
              className="h-11 w-11 flex items-center justify-center text-gray-400 hover:text-blue-600 transition shrink-0"
              title={t("categories.manage")}>
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={() => setShowPinnedOnly((prev) => !prev)} className={`${showPinnedOnly ? "ui-btn ui-btn-primary" : "ui-btn ui-btn-ghost"} h-11 whitespace-nowrap`}>
              {t("memos.pinnedOnly")}
            </button>
            <button onClick={() => setShowTagCloud(true)}
              className={`ui-btn h-11 whitespace-nowrap ${selectedTag ? "ui-btn-primary" : "ui-btn-ghost"}`}>
              <Tag className="w-4 h-4" />{t("bookmarks.tags")}
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shrink-0"
              title={t("memos.add")}>
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TIME_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setTimeFilter(f.value)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${timeFilter === f.value ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                {t(f.labelKey)}
              </button>
            ))}
            <div className="flex items-center gap-1.5 ml-auto">
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="ui-input h-9 px-2 text-sm w-[140px]" />
              <span className="text-gray-400 text-sm flex-shrink-0">—</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="ui-input h-9 px-2 text-sm w-[140px]" />
              {(dateRange.start || dateRange.end) && (
                <button onClick={() => setDateRange({ start: "", end: "" })} className="text-gray-400 hover:text-red-500 flex-shrink-0 p-1">×</button>
              )}
            </div>
          </div>
        </div>
        {selectedTag && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t("common.filterBy")}:</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-sm">
              #{selectedTag}
              <button onClick={() => setSelectedTag("")} className="text-white/80 hover:text-white ml-0.5">×</button>
            </span>
          </div>
        )}
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
        showPinnedOnly ? (
          <div className="space-y-3">
            {filteredMemos.map(renderMemoCard)}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[13px] top-[18px] bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700/50" />
            <div className="space-y-8">
              {groupedMemos.map((group) => (
                <div key={group.key} className="ml-7">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`-ml-[21px] w-3 h-3 rounded-full z-10 ring-[5px] ring-[var(--color-surface-2)] flex-shrink-0 ${group.key === 'today' ? 'bg-blue-500 shadow-sm shadow-blue-500/30' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {group.labelKey === "timelineYearMonth"
                        ? t("memos.timelineYearMonth", { year: group.year, month: String(group.month).padStart(2, "0") })
                        : t(`memos.${group.labelKey}`)}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {group.items.map(renderMemoCard)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
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

      <Modal show={showTagCloud} title={t("bookmarks.tags")} onClose={() => setShowTagCloud(false)}>
        <div className="space-y-4">
          {selectedTag && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t("common.filterBy")}:</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-sm">
                #{selectedTag}
                <button onClick={() => setSelectedTag("")} className="text-white/80 hover:text-white ml-0.5">×</button>
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setSelectedTag(""); setShowTagCloud(false) }}
              className={`px-3 py-1.5 rounded-lg text-sm ${!selectedTag ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
              {t("common.all")}
            </button>
            {tags.map((tag: string) => (
              <button key={tag} onClick={() => { setSelectedTag(tag === selectedTag ? "" : tag); setShowTagCloud(false) }}
                className={`px-3 py-1.5 rounded-lg text-sm ${selectedTag === tag ? "bg-blue-600 text-white" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"}`}>
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal show={showCategoryModal} title={t("categories.title")} onClose={() => {
        setShowCategoryModal(false)
        setEditingCategoryId(null)
        setEditCategoryName("")
        setEditCategoryColor("#3b82f6")
      }}>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("categories.add")}</h4>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input type="text" value={categoryNameState} onChange={(e) => setCategoryNameState(e.target.value)}
                  placeholder={t("categories.namePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <input type="color" value={categoryColorState} onChange={(e) => setCategoryColorState(e.target.value)}
                className="w-10 h-[42px] border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer" />
              <button onClick={handleAddCategory} disabled={!categoryNameState.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap">
                {t("common.add")}
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("categories.existing")}</h4>
            {categories.filter(c => c.type === "memo").length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">{t("categories.noCategories")}</p>
            ) : (
              <div className="space-y-1">
                {categories.filter(c => c.type === "memo").map((c) => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || '#3b82f6' }} />
                    {editingCategoryId === c.id ? (
                      <>
                        <input type="text" value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                        <input type="color" value={editCategoryColor} onChange={(e) => setEditCategoryColor(e.target.value)}
                          className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer" />
                        <button onClick={() => handleUpdateCategory(c.id, { name: editCategoryName, color: editCategoryColor })}
                          className="p-1 text-green-600 hover:text-green-700" title={t("common.save")}><Check className="w-4 h-4" /></button>
                        <button onClick={() => { setEditingCategoryId(null) }}
                          className="p-1 text-gray-400 hover:text-gray-600" title={t("common.cancel")}><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{c.name}</span>
                        <button onClick={() => { setEditingCategoryId(c.id); setEditCategoryName(c.name); setEditCategoryColor(c.color || '#3b82f6') }}
                          className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition" title={t("categories.edit")}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteCategory(c.id)}
                          className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition" title={t("categories.delete")}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

function formatDateKey(dateStr: string, t: (key: string, opts?: any) => string): string {
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z')
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
