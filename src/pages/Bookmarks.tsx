import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { useBookmarkStore } from "../stores/bookmarkStore"
import { userBookmarkApi, userCategoryApi, tagApi, fetchMetaApi, submissionApi } from "../services/api"
import { Bookmark } from "../types"
import { Plus, Search, Star, Trash2, Edit2, Folder, X, Loader2, Upload, Download, Share2, Archive } from "lucide-react"
import Favicon from "../components/Favicon"

export default function Bookmarks() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { bookmarks, categories, tags, setBookmarks, setCategories, setTags, addBookmark, updateBookmark, removeBookmark, addCategory } = useBookmarkStore()

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
  const [submittingShare, setSubmittingShare] = useState<string | null>(null)

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
    } catch (err) {
      console.error("Failed to load data:", err)
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
      alert("抓取失败: " + (err.message || "请手动填写"))
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
      alert(err.message || t("common.error"))
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
      alert(err.message || t("common.error"))
    }
  }

  async function handleDeleteBookmark(id: string) {
    if (!token || !confirm(t("bookmarks.deleteConfirm"))) return
    try {
      await userBookmarkApi.delete(token, id)
      removeBookmark(id)
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  async function handleToggleFavorite(id: string, current: number) {
    if (!token) return
    try {
      const res = await userBookmarkApi.update(token, id, { is_favorite: current ? 0 : 1 })
      updateBookmark(id, res)
    } catch (err: any) {
      alert(err.message || t("common.error"))
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
      alert(err.message || t("common.error"))
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
      alert(err.message || t("common.error"))
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
      alert("提交成功，等待管理员审核")
    } catch (err: any) {
      alert(err.message || t("common.error"))
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
      alert(err.message || t("common.error"))
    }
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

  const Modal = ({ show, title, children, onClose }: { show: boolean; title: string; children: React.ReactNode; onClose: () => void }) => {
    if (!show) return null
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto p-6"><div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div></div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">私人收藏夹</h1>
          <p className="text-sm text-gray-500 mt-1">管理你自己的收藏，可申请分享到公开导航</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <Download className="w-4 h-4" />导出
          </button>
          <button onClick={() => setShowCategoryModal(true)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <Folder className="w-4 h-4" />分类
          </button>
          <button onClick={openAddModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />{t("bookmarks.add")}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder={t("bookmarks.search")} value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">{t("bookmarks.allCategories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button onClick={() => setShowFavoritesOnly(v => !v)}
          className={`px-4 py-2 rounded-lg ${showFavoritesOnly ? "bg-yellow-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
          仅收藏
        </button>
        <button onClick={() => setShowArchived(v => !v)}
          className={`px-4 py-2 rounded-lg ${showArchived ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
          {showArchived ? "查看未归档" : "查看归档"}
        </button>
      </div>

      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">暂无私人收藏</p>
          <button onClick={openAddModal} className="text-blue-600 hover:text-blue-700 font-medium">添加第一个收藏</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookmarks.map((b) => {
            const tagsArray = typeof b.tags === "string" ? JSON.parse(b.tags || "[]") : b.tags
            return (
              <div key={b.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Favicon src={b.icon_url} title={b.title} size="sm" />
                    <a href={b.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline truncate">{b.title}</a>
                  </div>
                  <button onClick={() => handleToggleFavorite(b.id, b.is_favorite)} className={`p-1 rounded hover:bg-gray-100 ${b.is_favorite ? "text-yellow-500" : "text-gray-400"}`}>
                    <Star className="w-4 h-4" fill={b.is_favorite ? "currentColor" : "none"} />
                  </button>
                </div>
                <p className="text-sm text-gray-600 truncate mb-2">{b.url}</p>
                {b.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{b.description}</p>}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {b.category_id && <span className="text-xs px-2 py-1 bg-gray-100 rounded">{categories.find(c => c.id === b.category_id)?.name || t("common.noCategory")}</span>}
                  {tagsArray.slice(0, 2).map((tag: string, i: number) => <span key={i} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">#{tag}</span>)}
                </div>
                <div className="flex flex-wrap gap-1 justify-between items-center">
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(b)} className="p-1 text-gray-500 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteBookmark(b.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => handleToggleArchived(b.id, b.archived)} className="p-1 text-gray-500 hover:text-purple-600"><Archive className="w-4 h-4" /></button>
                  </div>
                  <button onClick={() => handleShareBookmark(b)} disabled={submittingShare === b.id}
                    className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 flex items-center gap-1 disabled:opacity-50">
                    {submittingShare === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}申请分享
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <Modal show={showAddModal} title={t("bookmarks.add")} onClose={() => setShowAddModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.url")}</label>
            <div className="flex gap-2">
              <input type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder={t("bookmarks.urlPlaceholder")}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <button onClick={handleFetchMeta} disabled={fetching || !formData.url.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : "🔍"}{fetching ? "抓取中..." : "抓取"}
              </button>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.title")}</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={t("bookmarks.titlePlaceholder")} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.description")}</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t("bookmarks.descriptionPlaceholder")} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.category")}</label><select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"><option value="">{t("common.noCategory")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.tags")}</label><input type="text" value={typeof formData.tags === "string" ? formData.tags : formData.tags.join(", ")} onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",") })} placeholder={t("bookmarks.tagsPlaceholder")} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div className="flex gap-2 pt-4"><button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button><button onClick={handleAddBookmark} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button></div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} title={t("bookmarks.edit")} onClose={() => setShowEditModal(false)}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.url")}</label><input type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.title")}</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.description")}</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.category")}</label><select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"><option value="">{t("common.noCategory")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.tags")}</label><input type="text" value={typeof formData.tags === "string" ? formData.tags : formData.tags.join(", ")} onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(",") })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div className="flex gap-2 pt-4"><button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button><button onClick={handleUpdateBookmark} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button></div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal show={showCategoryModal} title={t("categories.add")} onClose={() => setShowCategoryModal(false)}>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("categories.name")}</label><input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder={t("categories.namePlaceholder")} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">{t("categories.color")}</label><input type="color" value={categoryColor} onChange={(e) => setCategoryColor(e.target.value)} className="w-full h-10 border border-gray-300 rounded-lg" /></div>
          <div className="flex gap-2 pt-4"><button onClick={() => setShowCategoryModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button><button onClick={handleAddCategory} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button></div>
        </div>
      </Modal>
    </div>
  )
}
