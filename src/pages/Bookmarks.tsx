import { useState, useEffect } from "react"
import { useToast } from "../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { useBookmarkStore } from "../stores/bookmarkStore"
import { userBookmarkApi, userCategoryApi, tagApi, fetchMetaApi, submissionApi } from "../services/api"
import { Bookmark } from "../types"
import { Plus, Search, Star, Trash2, Edit2, Folder, X, Loader2, Upload, Download, Share2, Archive, CheckSquare, Square, CheckCheck } from "lucide-react"
import Favicon from "../components/Favicon"
import Modal from "../components/Modal"
import ImageUploader from "../components/ImageUploader"
import EmptyState from "../components/EmptyState"
import PageHeader from "../components/PageHeader"
import SectionCard from "../components/SectionCard"
import FilterBar from "../components/FilterBar"

export default function Bookmarks() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { bookmarks, categories, tags, setBookmarks, setCategories, setTags, addBookmark, updateBookmark, removeBookmark, addCategory } = useBookmarkStore()
  const { toast, confirm } = useToast()

  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [submittingShare, setSubmittingShare] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)
  const [pageError, setPageError] = useState("")

  const [formData, setFormData] = useState({
    title: "", url: "", description: "", icon_url: "", category_id: "", tags: [] as string[], is_favorite: 0,
  })
  const [categoryName, setCategoryName] = useState("")
  const [categoryColor, setCategoryColor] = useState("#3b82f6")

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
      setPageError(err?.message || "加载收藏失败")
      toast(err?.message || "加载收藏失败", "error")
    } finally {
      setLoading(false)
    }
  }

  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || b.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  async function handleFetchMeta() {
    if (!formData.url.trim()) return
    setFetching(true)
    try {
      const meta = await fetchMetaApi.fetch(formData.url)
      setFormData(prev => ({ ...prev, title: meta.title || prev.title, description: meta.description || prev.description, icon_url: meta.icon || prev.icon_url }))
    } catch (err: any) {
      toast("抓取失败: " + (err.message || "请手动填写"), "error")
    } finally {
      setFetching(false)
    }
  }

  async function handleAddBookmark() {
    if (!token || !formData.title || !formData.url) return
    try {
      const res = await userBookmarkApi.create(token, {
        ...formData,
        tags: typeof formData.tags === "string" ? formData.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : formData.tags,
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
        ...formData,
        tags: typeof formData.tags === "string" ? formData.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : formData.tags,
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
      }
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleAddCategory() {
    if (!token || !categoryName.trim()) return
    try {
      const res = await userCategoryApi.create(token, { name: categoryName, color: categoryColor })
      addCategory(res)
      setShowCategoryModal(false)
      setCategoryName("")
      setCategoryColor("#3b82f6")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleShareBookmark(bookmark: Bookmark) {
    if (!token) return
    setSubmittingShare(bookmark.id)
    try {
      const tagsArray = typeof bookmark.tags === "string" ? JSON.parse(bookmark.tags || "[]") : bookmark.tags
      await submissionApi.create(token, {
        user_bookmark_id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description,
        icon_url: bookmark.icon_url,
        tags: tagsArray,
      })
      toast("提交成功，等待管理员审核", "success")
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
      a.href = url
      a.download = `simplisave-bookmarks-${Date.now()}.json`
      a.click()
      window.URL.revokeObjectURL(url)
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
      a.href = url
      a.download = `simplisave-bookmarks-${Date.now()}.html`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleImportFile(file: File) {
    if (!token) return
    setImporting(true)
    try {
      const html = await file.text()
      const result = await userBookmarkApi.importHtml(token, html)
      toast(`导入完成：${result.imported}/${result.total}`, "success")
      await loadData()
    } catch (err: any) {
      toast(err.message || "导入失败", "error")
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
    if (selectedIds.size === filteredBookmarks.length) {
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

  async function handleBatchArchive(archived: boolean) {
    if (!token || selectedIds.size === 0) return
    setBatchLoading(true)
    try {
      await Promise.all(Array.from(selectedIds).map(id => userBookmarkApi.update(token, id, { archived: archived ? 1 : 0 })))
      await loadData()
      setSelectedIds(new Set())
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    } finally {
      setBatchLoading(false)
    }
  }

  async function handleBatchFavorite(favorite: boolean) {
    if (!token || selectedIds.size === 0) return
    setBatchLoading(true)
    try {
      await Promise.all(Array.from(selectedIds).map(id => userBookmarkApi.update(token, id, { is_favorite: favorite ? 1 : 0 })))
      await loadData()
      setSelectedIds(new Set())
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    } finally {
      setBatchLoading(false)
    }
  }

  async function handleBatchShare() {
    if (!token || selectedIds.size === 0) return
    setBatchLoading(true)
    let successCount = 0
    let failCount = 0
    for (const id of selectedIds) {
      const b = bookmarks.find(b => b.id === id)
      if (!b) continue
      try {
        const tagsArray = typeof b.tags === "string" ? JSON.parse(b.tags || "[]") : b.tags
        await submissionApi.create(token, {
          user_bookmark_id: b.id, title: b.title, url: b.url,
          description: b.description, icon_url: b.icon_url, tags: tagsArray,
        })
        successCount++
      } catch {
        failCount++
      }
    }
    toast(t("bookmarks.batchShareResult", { success: successCount, fail: failCount ? `，失败 ${failCount} 个` : '' }))
    setSelectedIds(new Set())
    setBatchLoading(false)
  }

  function openEditModal(b: Bookmark) {
    setEditingBookmark(b)
    setFormData({
      title: b.title,
      url: b.url,
      description: b.description || "",
      icon_url: b.icon_url || "",
      category_id: b.category_id || "",
      tags: typeof b.tags === "string" ? JSON.parse(b.tags || "[]") : (b.tags || []),
      is_favorite: b.is_favorite,
    })
    setShowEditModal(true)
  }

  function openAddModal() {
    setFormData({ title: "", url: "", description: "", icon_url: "", category_id: "", tags: [], is_favorite: 0 })
    setShowAddModal(true)
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto p-6"><div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div></div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title="私人收藏夹" description="管理你自己的收藏，可申请分享到公开导航。" />

      <SectionCard className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <label className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />{importing ? "导入中..." : "导入HTML"}
            <input type="file" accept=".html,text/html" className="hidden" disabled={importing}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.currentTarget.value = "" }} />
          </label>
          <button onClick={handleExportHtml} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2">
            <Download className="w-4 h-4" />导出HTML
          </button>
          <button onClick={handleExport} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2">
            <Download className="w-4 h-4" />导出JSON
          </button>
          <button onClick={() => setShowCategoryModal(true)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2">
            <Folder className="w-4 h-4" />分类
          </button>
          <button onClick={openAddModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />{t("bookmarks.add")}
          </button>
        </div>
        </div>
      </SectionCard>

      <SectionCard className="mb-6">
      <FilterBar className="items-stretch">
        <div className="relative min-w-0 flex-[2]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder={t("bookmarks.search")} value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ui-input h-11 w-full pl-10 pr-4" />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
          className="ui-select h-11 min-w-[180px] px-4">
          <option value="all">{t("bookmarks.allCategories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button onClick={() => setShowFavoritesOnly(v => !v)}
          className={`h-11 rounded-xl px-4 ${showFavoritesOnly ? "bg-yellow-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
          仅收藏
        </button>
        <button onClick={() => setShowArchived(v => !v)}
          className={`h-11 rounded-xl px-4 ${showArchived ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
          {showArchived ? "查看未归档" : "查看归档"}
        </button>
      </FilterBar>
      </SectionCard>

      {pageError ? (
        <EmptyState title="加载失败" description={pageError} tone="error" />
      ) : null}

      {!pageError && filteredBookmarks.length > 0 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <button onClick={toggleSelectAll} className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600">
            {selectedIds.size === filteredBookmarks.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {t("bookmarks.selectAll")}
          </button>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            {selectedIds.size > 0
              ? t("bookmarks.selected", { count: selectedIds.size })
              : t("bookmarks.total", { count: filteredBookmarks.length })}
          </span>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => handleBatchFavorite(true)} disabled={batchLoading}
                className="px-2.5 py-1 text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/50 disabled:opacity-50">{t("bookmarks.batchFavorite")}</button>
              <button onClick={() => handleBatchArchive(true)} disabled={batchLoading}
                className="px-2.5 py-1 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-50">{t("bookmarks.batchArchive")}</button>
              <button onClick={handleBatchShare} disabled={batchLoading}
                className="px-2.5 py-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50">{t("bookmarks.batchShare")}</button>
              <button onClick={handleBatchDelete} disabled={batchLoading}
                className="px-2.5 py-1 text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50">{t("bookmarks.batchDelete")}</button>
            </div>
          )}
        </div>
      )}

      {!pageError && filteredBookmarks.length === 0 ? (
        <EmptyState
          title={searchQuery || selectedCategory !== "all" ? "没有匹配收藏" : "暂无私人收藏"}
          description={searchQuery || selectedCategory !== "all" ? "试试切换分类或更换关键词。" : "可先新增收藏，或导入浏览器书签。"}
          icon={<Folder className="w-6 h-6" />}
          action={searchQuery || selectedCategory !== "all" ? undefined : <button onClick={openAddModal} className="ui-btn ui-btn-primary">添加第一个收藏</button>}
        />
      ) : !pageError ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookmarks.map((b) => {
            const tagsArray = typeof b.tags === "string" ? JSON.parse(b.tags || "[]") : b.tags
            return (
              <div key={b.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/30 p-4 hover:shadow-lg transition ${selectedIds.has(b.id) ? 'ring-2 ring-blue-400' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button onClick={() => toggleSelect(b.id)} className="shrink-0 text-gray-400 dark:text-gray-500 hover:text-blue-500">
                      {selectedIds.has(b.id) ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4" />}
                    </button>
                    <Favicon src={b.icon_url} title={b.title} size="sm" />
                    <a href={b.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline truncate">{b.title}</a>
                  </div>
                  <button onClick={() => handleToggleFavorite(b.id, b.is_favorite)} className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${b.is_favorite ? "text-yellow-500 dark:text-yellow-400" : "text-gray-400 dark:text-gray-500"}`}>
                    <Star className="w-4 h-4" fill={b.is_favorite ? "currentColor" : "none"} />
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">{b.url}</p>
                {b.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{b.description}</p>}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {b.category_id && <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{categories.find(c => c.id === b.category_id)?.name || t("common.noCategory")}</span>}
                  {tagsArray.slice(0, 2).map((tag: string, i: number) => <span key={i} className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded">#{tag}</span>)}
                </div>
                <div className="flex flex-wrap gap-1 justify-between items-center">
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(b)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteBookmark(b.id)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => handleToggleArchived(b.id, b.archived)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-purple-600"><Archive className="w-4 h-4" /></button>
                  </div>
                  <button onClick={() => handleShareBookmark(b)} disabled={submittingShare === b.id}
                    className="text-xs px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-100 dark:hover:bg-green-900/50 flex items-center gap-1 disabled:opacity-50">
                    {submittingShare === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}申请分享
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Add Modal */}
      <Modal show={showAddModal} title={t("bookmarks.add")} onClose={() => setShowAddModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.url")}</label>
            <div className="flex gap-2">
              <input type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder={t("bookmarks.urlPlaceholder")}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <button onClick={handleFetchMeta} disabled={fetching || !formData.url.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : "🔍"}{fetching ? "抓取中..." : "抓取"}
              </button>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.title")}</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={t("bookmarks.titlePlaceholder")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.description")}</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t("bookmarks.descriptionPlaceholder")} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.category")}</label><select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"><option value="">{t("common.noCategory")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.icon")}</label>
            <div className="flex gap-2">
              <ImageUploader type="icon" value={formData.icon_url} onChange={(url) => setFormData({ ...formData, icon_url: url })} className="w-16 h-16" />
              <input type="text" value={formData.icon_url} onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })} placeholder="https://example.com/icon.png" className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.tags")}</label><input type="text" value={typeof formData.tags === "string" ? formData.tags : formData.tags.join(", ")} onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",") })} placeholder={t("bookmarks.tagsPlaceholder")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div className="flex gap-2 pt-4"><button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button><button onClick={handleAddBookmark} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button></div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} title={t("bookmarks.edit")} onClose={() => setShowEditModal(false)}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.url")}</label><input type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.title")}</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.description")}</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.category")}</label><select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"><option value="">{t("common.noCategory")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.icon")}</label>
            <div className="flex gap-2">
              <ImageUploader type="icon" value={formData.icon_url} onChange={(url) => setFormData({ ...formData, icon_url: url })} className="w-16 h-16" />
              <input type="text" value={formData.icon_url} onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })} placeholder="https://example.com/icon.png" className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.tags")}</label><input type="text" value={typeof formData.tags === "string" ? formData.tags : formData.tags.join(", ")} onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",") })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div className="flex gap-2 pt-4"><button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button><button onClick={handleUpdateBookmark} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button></div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal show={showCategoryModal} title={t("categories.add")} onClose={() => setShowCategoryModal(false)}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("categories.name")}</label><input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder={t("categories.namePlaceholder")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("categories.color")}</label><input type="color" value={categoryColor} onChange={(e) => setCategoryColor(e.target.value)} className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
          <div className="flex gap-2 pt-4"><button onClick={() => setShowCategoryModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button><button onClick={handleAddCategory} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button></div>
        </div>
      </Modal>
    </div>
  )
}
