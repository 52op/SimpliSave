import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { publicBookmarkApi, publicCategoryApi } from "../../services/api"
import { PublicBookmark, Category } from "../../types"
import { Plus, Trash2, Edit2, X, ExternalLink, Globe } from "lucide-react"
import Favicon from "../../components/Favicon"

export default function AdminBookmarks() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const [bookmarks, setBookmarks] = useState<PublicBookmark[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingBm, setEditingBm] = useState<PublicBookmark | null>(null)
  const [page, setPage] = useState(1)

  const pageSize = 15
  const defaultForm = { title: "", url: "", description: "", icon_url: "", category_id: "" }
  const [form, setForm] = useState(defaultForm)

  useEffect(() => { loadCategories() }, [])

  useEffect(() => { loadData(); setPage(1) }, [search, categoryFilter])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  async function loadCategories() {
    try {
      const res = await publicCategoryApi.list()
      setCategories(res)
    } catch (err) {
      console.error(err)
    }
  }

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      const params: { category_id?: string; q?: string } = {}
      if (categoryFilter) params.category_id = categoryFilter
      if (search) params.q = search
      const res = await publicBookmarkApi.list(params)
      setBookmarks(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(bookmarks.length / pageSize)
  const paged = bookmarks.slice((page - 1) * pageSize, page * pageSize)

  async function handleSave() {
    if (!token || !form.title.trim() || !form.url.trim()) return
    let url = form.url.trim()
    if (!/^https?:\/\//i.test(url)) url = "https://" + url
    try {
      const data: any = {
        title: form.title.trim(),
        url,
        description: form.description.trim() || null,
        icon_url: form.icon_url.trim() || null,
        category_id: form.category_id || null,
      }
      if (editingBm) {
        const res = await publicBookmarkApi.update(token, editingBm.id, data)
        setBookmarks(bookmarks.map(b => b.id === editingBm.id ? res : b))
      } else {
        const res = await publicBookmarkApi.create(token, data)
        setBookmarks([res, ...bookmarks])
      }
      setShowModal(false)
      setEditingBm(null)
      setForm({ ...defaultForm })
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  async function handleDelete(id: string) {
    if (!token || !confirm(t("admin.bookmarks.confirmDelete"))) return
    try {
      await publicBookmarkApi.delete(token, id)
      setBookmarks(bookmarks.filter(b => b.id !== id))
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  function openEdit(bm: PublicBookmark) {
    setEditingBm(bm)
    setForm({
      title: bm.title,
      url: bm.url,
      description: bm.description || "",
      icon_url: bm.icon_url || "",
      category_id: bm.category_id || "",
    })
    setShowModal(true)
  }

  function openAdd() {
    setEditingBm(null)
    setForm({ ...defaultForm })
    setShowModal(true)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("admin.bookmarks.title")}</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />{t("admin.bookmarks.add")}
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t("bookmarks.search")}
          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">{t("bookmarks.allCategories")}</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : paged.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow text-gray-500">
          <Globe className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>暂无公开链接</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("bookmarks.title")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("bookmarks.url")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("bookmarks.category")}</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">{t("bookmarks.visitCount")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("common.createdAt")}</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(b => (
                <tr key={b.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{b.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Favicon src={b.icon_url} title={b.title} size="sm" />
                      <span className="font-medium text-gray-900">{b.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a href={b.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {b.url.length > 40 ? b.url.slice(0, 40) + "..." : b.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{b.category_name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-500">{b.visit_count ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => openEdit(b)} className="p-1 text-gray-500 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(b.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">上一页</button>
          <span className="text-sm text-gray-500">第 {page}/{totalPages} 页</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50">下一页</button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{editingBm ? t("admin.bookmarks.edit") : t("admin.bookmarks.add")}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("admin.bookmarks.formTitle")}</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("admin.bookmarks.formUrl")}</label>
                <input type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("admin.bookmarks.formDescription")}</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("admin.bookmarks.formIcon")}</label>
                <input type="text" value={form.icon_url} onChange={(e) => setForm({ ...form, icon_url: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("admin.bookmarks.formCategory")}</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">{t("common.noCategory")}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
                <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
