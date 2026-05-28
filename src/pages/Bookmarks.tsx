import { useState, useEffect, useCallback, useRef } from "react"
import { useToast } from "../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { useBookmarkStore } from "../stores/bookmarkStore"
import { userBookmarkApi, userCategoryApi, tagApi, fetchMetaApi, submissionApi, imagebedApi } from "../services/api"
import { Bookmark } from "../types"
import { Plus, Search, Upload, Download, Folder, X, Loader2, Menu, PanelLeftClose, Trash2, ArrowUpDown, MoreHorizontal, Tag, Star, Archive } from "lucide-react"
import { translateText } from "../utils/translate"
import Modal from "../components/Modal"
import ImageUploader from "../components/ImageUploader"
import EmptyState from "../components/EmptyState"
import PageHeader from "../components/PageHeader"
import SectionCard from "../components/SectionCard"
import FilterBar from "../components/FilterBar"
import CategoryTree from "../components/CategoryTree"
import BookmarkListView from "../components/BookmarkListView"
import ImportPreviewDialog from "../components/ImportPreviewDialog"
import TagInput from "../components/TagInput"
import { pinyinMatch } from "../utils/pinyin"

export default function Bookmarks() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { bookmarks, categories, tags, setBookmarks, setCategories, setTags, addBookmark, updateBookmark, removeBookmark, addCategory } = useBookmarkStore()
  const { toast, confirm } = useToast()

  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>("all")
  const [selectedTag, setSelectedTag] = useState<string>("")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<any>(null)
  const [importHtmlContent, setImportHtmlContent] = useState("")
  const [submittingShare, setSubmittingShare] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)
  const [pageError, setPageError] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const [syncIconLoading, setSyncIconLoading] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [showTagCloud, setShowTagCloud] = useState(false)

  useEffect(() => {
    if (!moreOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [moreOpen])

  const [formData, setFormData] = useState({
    title: "", url: "", description: "", icon_url: "", category_id: "", tags: [] as string[], is_favorite: 0,
  })
  const [categoryName, setCategoryName] = useState("")
  const [categoryColor, setCategoryColor] = useState("#3b82f6")
  const [categoryParentId, setCategoryParentId] = useState("")

  useEffect(() => { loadData() }, [showFavoritesOnly, showArchived])

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      const [bmRes, catRes, tagRes] = await Promise.all([
        userBookmarkApi.list(token, { favorites: showFavoritesOnly, archived: showArchived }),
        userCategoryApi.list(token),
        tagApi.list(token, "bookmark"),
      ])
      setBookmarks(bmRes)
      setCategories(catRes)
      setTags(tagRes)
      setPageError("")
    } catch (err: any) {
      const msg = err?.message || t("bookmarks.loadFailed")
      setPageError(msg)
      toast(msg, "error")
    } finally {
      setLoading(false)
    }
  }

  const selectedCategoryId = selectedCategory === "all" ? null : selectedCategory

  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesSearch = !searchQuery || pinyinMatch(b.title, searchQuery) ||
      b.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && pinyinMatch(b.description, searchQuery))
    const matchesCategory = selectedCategoryId === null || b.category_id === selectedCategoryId
    const tagsArr = typeof b.tags === "string" ? JSON.parse(b.tags || "[]") : (b.tags || [])
    const matchesTag = !selectedTag || tagsArr.includes(selectedTag)
    return matchesSearch && matchesCategory && matchesTag
  })

  async function handleFetchMeta() {
    if (!formData.url.trim()) return
    setFetching(true)
    try {
      const meta = await fetchMetaApi.fetch(formData.url)
      const rawTitle = meta.title || formData.title
      const rawDesc = meta.description || formData.description
      const [title, description] = await translateText([rawTitle, rawDesc])
      setFormData(prev => ({ ...prev, title, description, icon_url: meta.icon || prev.icon_url }))
      toast(t("bookmarks.fetchSuccess"), "success")
    } catch (err: any) {
      toast(t("bookmarks.fetchFailed", { msg: err?.message || t("bookmarks.fetchManual") }), "error")
    } finally {
      setFetching(false)
    }
  }

  async function handleAddBookmark() {
    if (!token || !formData.title || !formData.url) return
    try {
      const res = await userBookmarkApi.create(token, {
        ...formData, category_id: formData.category_id || undefined,
        tags: formData.tags,
      })
      addBookmark(res)
      setShowAddModal(false)
      setFormData({ title: "", url: "", description: "", icon_url: "", category_id: "", tags: [], is_favorite: 0 })
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleUpdateBookmark() {
    if (!token || !editingBookmark) return
    try {
      const res = await userBookmarkApi.update(token, editingBookmark.id, {
        ...formData, category_id: formData.category_id || undefined,
        tags: formData.tags,
      })
      updateBookmark(editingBookmark.id, res)
      setShowEditModal(false)
      setEditingBookmark(null)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleDeleteBookmark(id: string) {
    if (!token || !await confirm(t("bookmarks.deleteConfirm"))) return
    try {
      await userBookmarkApi.delete(token, id)
      removeBookmark(id)
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleToggleFavorite(id: string, current: number) {
    if (!token) return
    try {
      const res = await userBookmarkApi.update(token, id, { is_favorite: current ? 0 : 1 })
      updateBookmark(id, res)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleToggleArchived(id: string, current: number) {
    if (!token) return
    try {
      const res = await userBookmarkApi.update(token, id, { archived: current ? 0 : 1 })
      updateBookmark(id, res)
      if ((showArchived && !current) || (!showArchived && current === 0)) {
        setBookmarks(bookmarks.filter(b => b.id !== id))
        setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
      }
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleAddCategory(name?: string) {
    if (!token) return
    try {
      const res = await userCategoryApi.create(token, {
        name: name || categoryName,
        color: categoryColor,
        type: "bookmark",
        parent_id: categoryParentId || undefined,
      })
      addCategory(res)
      setShowCategoryModal(false)
      setCategoryName("")
      setCategoryColor("#3b82f6")
      setCategoryParentId("")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  function getCategoryOptions() {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order)
    const childrenMap = new Map<string | null, typeof sorted>()
    for (const cat of sorted) {
      const key = cat.parent_id ?? '__root__'
      if (!childrenMap.has(key)) childrenMap.set(key, [])
      childrenMap.get(key)!.push(cat)
    }
    const result: { id: string; label: string }[] = []
    function walk(parentId: string | null, depth: number) {
      const children = childrenMap.get(parentId ?? '__root__') || []
      for (const cat of children) {
        result.push({ id: cat.id, label: '\u3000'.repeat(depth) + cat.name })
        walk(cat.id, depth + 1)
      }
    }
    walk(null, 0)
    return result
  }

  async function handleShareBookmark(bookmark: Bookmark) {
    if (!token) return
    setSubmittingShare(bookmark.id)
    try {
      const tagsArray = typeof bookmark.tags === "string" ? JSON.parse(bookmark.tags || "[]") : bookmark.tags
      await submissionApi.create(token, {
        user_bookmark_id: bookmark.id, title: bookmark.title, url: bookmark.url,
        description: bookmark.description, icon_url: bookmark.icon_url, tags: tagsArray,
      })
      toast(t("bookmarks.shareSuccess"), "success")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    } finally {
      setSubmittingShare(null)
    }
  }

  async function handleExport() {
    if (!token) return
    try {
      const res = await userBookmarkApi.export(token)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `simplisave-bookmarks-${Date.now()}.json`
      a.click(); window.URL.revokeObjectURL(url)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleExportHtml() {
    if (!token) return
    try {
      const res = await userBookmarkApi.exportHtml(token)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `simplisave-bookmarks-${Date.now()}.html`
      a.click(); window.URL.revokeObjectURL(url)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleImportFile(file: File) {
    if (!token) return
    setImporting(true)
    try {
      const html = await file.text()
      const preview = await userBookmarkApi.previewImport(token, html)
      if (preview.existing_categories.length > 0) {
        setImportPreview(preview)
        setImportHtmlContent(html)
        setImporting(false)
        return
      }
      const result = await userBookmarkApi.importHtml(token, html)
      toast(t("bookmarks.importResult", { imported: result.imported, total: result.total }), "success")
      await loadData()
    } catch (err: any) {
      toast(err.message || t("bookmarks.importFailed"), "error")
    } finally {
      setImporting(false)
    }
  }

  async function handleImportConfirm(renameMap: Record<string, string>) {
    if (!token || !importHtmlContent) return
    setImporting(true)
    setImportPreview(null)
    setImportHtmlContent("")
    try {
      const result = await userBookmarkApi.importHtml(token, importHtmlContent, renameMap)
      toast(t("bookmarks.importResult", { imported: result.imported, total: result.total }), "success")
      await loadData()
    } catch (err: any) {
      toast(err.message || t("bookmarks.importFailed"), "error")
    } finally {
      setImporting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredBookmarks.length && filteredBookmarks.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredBookmarks.map(b => b.id)))
    }
  }

  async function handleBatchDelete() {
    if (!token || selectedIds.size === 0) return
    if (!await confirm(t("bookmarks.batchDeleteConfirm", { count: selectedIds.size }))) return
    setBatchLoading(true)
    try {
      await Promise.all(Array.from(selectedIds).map(id => userBookmarkApi.delete(token, id)))
      setBookmarks(bookmarks.filter(b => !selectedIds.has(b.id)))
      setSelectedIds(new Set())
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    } finally {
      setBatchLoading(false)
    }
  }

  async function handleBatchMove(targetCategoryId: string | null) {
    if (!token || selectedIds.size === 0) return
    setBatchLoading(true)
    try {
      await userBookmarkApi.batchMove(token, Array.from(selectedIds), targetCategoryId)
      await loadData()
      setSelectedIds(new Set())
      setShowMoveModal(false)
      toast(t("bookmarks.moveSuccess"), "success")
    } catch (err: any) {
      toast(err.message || t("bookmarks.moveFailed"), "error")
    } finally {
      setBatchLoading(false)
    }
  }

  async function handleDragDrop(bookmarkId: string, targetCategoryId: string | null) {
    if (!token) return
    try {
      await userBookmarkApi.update(token, bookmarkId, { category_id: targetCategoryId || null })
      updateBookmark(bookmarkId, { category_id: targetCategoryId } as any)
      await loadData()
    } catch (err: any) {
      toast(err.message || t("bookmarks.moveFailed"), "error")
    }
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function openEditModal(b: Bookmark) {
    setEditingBookmark(b)
    setFormData({
      title: b.title, url: b.url, description: b.description || "",
      icon_url: b.icon_url || "", category_id: b.category_id || "",
      tags: typeof b.tags === "string" ? JSON.parse(b.tags || "[]") : (b.tags || []),
      is_favorite: b.is_favorite,
    })
    setShowEditModal(true)
  }

  function openAddModal(categoryId?: string) {
    setFormData({ title: "", url: "", description: "", icon_url: "", category_id: categoryId || "", tags: [], is_favorite: 0 })
    setShowAddModal(true)
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto p-6"><div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div></div>
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <PageHeader title={t("bookmarks.pageTitle")} description={t("bookmarks.pageDesc")} />

      {/* Toolbar */}
      <SectionCard className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setSidebarOpen(v => !v)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => setSidebarOpen(v => !v)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hidden lg:block">
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen(v => !v)}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5 text-sm"
            >
              <MoreHorizontal className="w-4 h-4" />更多
            </button>
            {moreOpen && (
              <div className="absolute top-full left-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg py-1 min-w-[140px] z-20">
                <label className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-surface-2)] cursor-pointer">
                  <Upload className="w-4 h-4 shrink-0" />{importing ? t("bookmarks.importing") : t("bookmarks.importLabel")}
                  <input type="file" accept=".html,text/html" className="hidden" disabled={importing}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleImportFile(f); setMoreOpen(false) } e.currentTarget.value = "" }} />
                </label>
                <button onClick={() => { handleExportHtml(); setMoreOpen(false) }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-surface-2)]">
                  <Download className="w-4 h-4 shrink-0" />{t("bookmarks.exportHtml")}
                </button>
                <button onClick={() => { handleExport(); setMoreOpen(false) }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-surface-2)]">
                  <Download className="w-4 h-4 shrink-0" />{t("bookmarks.exportJson")}
                </button>
                <div className="border-t border-[var(--color-border)] my-1" />
                <button onClick={() => { setShowCategoryModal(true); setMoreOpen(false) }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-surface-2)]">
                  <Folder className="w-4 h-4 shrink-0" />{t("bookmarks.sidebarCategories")}
                </button>
              </div>
            )}
          </div>
          <button onClick={() => openAddModal()} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" />{t("bookmarks.add")}
          </button>
          <div className="flex-1" />
          <button onClick={() => setShowFavoritesOnly(v => !v)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 ${showFavoritesOnly ? "bg-yellow-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
            <Star className={`w-4 h-4 ${showFavoritesOnly ? "fill-current" : ""}`} />{t("bookmarks.starred")}
          </button>
          <button onClick={() => setShowArchived(v => !v)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 ${showArchived ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
            <Archive className="w-4 h-4" />{showArchived ? t("bookmarks.unarchivedFilter") : t("bookmarks.archivedFilter")}
          </button>
          <button onClick={() => setShowTagCloud(true)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 ${selectedTag ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
            <Tag className="w-4 h-4" />{t("bookmarks.tags")}
          </button>
        </div>
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder={t("bookmarks.searchPlaceholder")} value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800" />
        </div>
        {selectedTag && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t("common.filterBy")}:</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-sm">
              #{selectedTag}
              <button onClick={() => setSelectedTag("")} className="text-white/80 hover:text-white ml-0.5">×</button>
            </span>
            <button onClick={() => setSelectedTag("")} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">{t("common.clear")}</button>
          </div>
        )}
      </SectionCard>

      {pageError ? (
        <EmptyState title={t("bookmarks.loadFailed")} description={pageError} tone="error" />
      ) : (
        <div className="flex gap-4">
          {/* Sidebar - Category Tree */}
          <div className={`shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden lg:w-0'}`}>
            <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 ${sidebarOpen ? '' : 'hidden lg:block'}`}
              style={{ height: 'calc(100vh - 220px)' }}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t("bookmarks.sidebarCategories")}</span>
                <button onClick={() => setShowCategoryModal(true)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <CategoryTree
                categories={categories}
                bookmarks={bookmarks}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={(id) => setSelectedCategory(id === null ? "all" : id)}
                onDropBookmark={handleDragDrop}
                onAddSubCategory={(parentId) => { setCategoryParentId(parentId); setShowCategoryModal(true) }}
                onRenameCategory={async (id, name) => {
                  if (!token) return
                  try { await userCategoryApi.update(token, id, { name }); await loadData() }
                  catch (err: any) { toast(err.message || t("bookmarks.renameFailed"), "error") }
                }}
                onDeleteCategory={async (id) => {
                  if (!token || !await confirm(t("bookmarks.deleteCategoryConfirm"))) return
                  try { await userCategoryApi.delete(token, id); await loadData() }
                  catch (err: any) { toast(err.message || t("bookmarks.deleteFailed"), "error") }
                }}
              />
            </div>
          </div>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
              <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("bookmarks.sidebarCategories")}</span>
                  <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
                </div>
                <CategoryTree
                  categories={categories}
                  bookmarks={bookmarks}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={(id) => { setSelectedCategory(id === null ? "all" : id); setSidebarOpen(false) }}
                  onDropBookmark={handleDragDrop}
                  onAddSubCategory={(parentId) => { setCategoryParentId(parentId); setShowCategoryModal(true) }}
                  onRenameCategory={async (id, name) => {
                    if (!token) return
                    try { await userCategoryApi.update(token, id, { name }); await loadData() }
                    catch (err: any) { toast(err.message || t("bookmarks.renameFailed"), "error") }
                  }}
                  onDeleteCategory={async (id) => {
                    if (!token || !await confirm(t("bookmarks.deleteCategoryConfirmShort"))) return
                    try { await userCategoryApi.delete(token, id); await loadData() }
                    catch (err: any) { toast(err.message || t("bookmarks.deleteFailed"), "error") }
                  }}
                />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <BookmarkListView
                bookmarks={filteredBookmarks}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onOpenEdit={openEditModal}
                onDelete={handleDeleteBookmark}
                onToggleFavorite={handleToggleFavorite}
                onToggleArchive={handleToggleArchived}
                onShare={handleShareBookmark}
                onDragStart={handleDragStart}
                onMoveToCategory={() => setShowMoveModal(true)}
                submittingShare={submittingShare}
              />

              {filteredBookmarks.length === 0 && !pageError && (
                <EmptyState
                  title={searchQuery || selectedCategory !== "all" ? t("bookmarks.noMatchTitle") : t("bookmarks.noBookmarks")}
                  description={searchQuery || selectedCategory !== "all" ? t("bookmarks.noMatchDesc") : t("bookmarks.noBookmarksDesc")}
                  icon={<Folder className="w-6 h-6" />}
                  action={searchQuery || selectedCategory !== "all" ? undefined : <button onClick={() => openAddModal()} className="ui-btn ui-btn-primary">{t("bookmarks.addFirstBtn")}</button>}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Dialog */}
      {importPreview && (
        <ImportPreviewDialog
          preview={importPreview}
          onConfirm={handleImportConfirm}
          onCancel={() => { setImportPreview(null); setImportHtmlContent("") }}
        />
      )}

      {/* Move to Category Modal */}
      <Modal show={showMoveModal} title={t("bookmarks.moveToCategory")} onClose={() => setShowMoveModal(false)}>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          <button onClick={() => handleBatchMove(null)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
            {t("bookmarks.noCategory")}
          </button>
          {getCategoryOptions().map(({ id, label }) => (
            <button key={id} onClick={() => handleBatchMove(id)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
              {label}
            </button>
          ))}
        </div>
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

      {/* Add Modal */}
      <Modal show={showAddModal} title={t("bookmarks.add")} onClose={() => setShowAddModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.url")}</label>
            <div className="flex gap-2">
              <input type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder={t("bookmarks.urlPlaceholder")}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <button onClick={handleFetchMeta} disabled={fetching || !formData.url.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : "🔍"}{fetching ? t("bookmarks.fetching") : t("bookmarks.fetch")}
              </button>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.title")}</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={t("bookmarks.titlePlaceholder")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.description")}</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t("bookmarks.descriptionPlaceholder")} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.category")}</label><select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"><option value="">{t("common.noCategory")}</option>{getCategoryOptions().map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.icon")}</label>
            <div className="flex gap-2">
              <ImageUploader type="icon" value={formData.icon_url} onChange={(url) => setFormData({ ...formData, icon_url: url })} className="w-16 h-16" />
              <input type="text" value={formData.icon_url} onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })} placeholder="https://example.com/icon.png" className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              <button
                type="button"
                disabled={syncIconLoading || !formData.icon_url}
                onClick={async () => {
                  if (!token || !formData.icon_url) return
                  setSyncIconLoading(true)
                  try {
                    const res = await imagebedApi.uploadByUrl(token, formData.icon_url, 'icon')
                    setFormData({ ...formData, icon_url: res.public_url })
                    toast(t("common.success"), "success")
                  } catch (e: any) {
                    toast(e.message || t("common.error"), "error")
                  } finally {
                    setSyncIconLoading(false)
                  }
                }}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                title={t("bookmarks.syncIcon")}
              >
                <Loader2 className={`w-4 h-4 ${syncIconLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.tags")}</label>
            <TagInput tags={formData.tags} onTagsChange={(tags) => setFormData({ ...formData, tags })} value={newTag} onChange={setNewTag} />
          </div>
          <div className="flex gap-2 pt-4"><button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button><button onClick={handleAddBookmark} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button></div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} title={t("bookmarks.edit")} onClose={() => setShowEditModal(false)}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.url")}</label><input type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.title")}</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.description")}</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.category")}</label><select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"><option value="">{t("common.noCategory")}</option>{getCategoryOptions().map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.icon")}</label>
            <div className="flex gap-2">
              <ImageUploader type="icon" value={formData.icon_url} onChange={(url) => setFormData({ ...formData, icon_url: url })} className="w-16 h-16" />
              <input type="text" value={formData.icon_url} onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })} placeholder="https://example.com/icon.png" className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              <button
                type="button"
                disabled={syncIconLoading || !formData.icon_url}
                onClick={async () => {
                  if (!token || !formData.icon_url) return
                  setSyncIconLoading(true)
                  try {
                    const res = await imagebedApi.uploadByUrl(token, formData.icon_url, 'icon')
                    setFormData({ ...formData, icon_url: res.public_url })
                    toast(t("common.success"), "success")
                  } catch (e: any) {
                    toast(e.message || t("common.error"), "error")
                  } finally {
                    setSyncIconLoading(false)
                  }
                }}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                title={t("bookmarks.syncIcon")}
              >
                <Loader2 className={`w-4 h-4 ${syncIconLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.tags")}</label><TagInput tags={formData.tags} onTagsChange={(tags) => setFormData({ ...formData, tags })} value={newTag} onChange={setNewTag} /></div>
          <div className="flex gap-2 pt-4"><button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button><button onClick={handleUpdateBookmark} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button></div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal show={showCategoryModal} title={t("categories.add")} onClose={() => setShowCategoryModal(false)}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("categories.name")}</label><input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder={t("categories.namePlaceholder")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.parentCategory")}</label><select value={categoryParentId} onChange={(e) => setCategoryParentId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"><option value="">{t("bookmarks.topLevel")}</option>{getCategoryOptions().map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("categories.color")}</label><input type="color" value={categoryColor} onChange={(e) => setCategoryColor(e.target.value)} className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
          <div className="flex gap-2 pt-4"><button onClick={() => setShowCategoryModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button><button onClick={() => handleAddCategory()} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button></div>
        </div>
      </Modal>
    </div>
  )
}
