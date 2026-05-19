import { useState, useEffect } from "react"
import { useToast } from "../../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { publicBookmarkApi, publicCategoryApi, cardGroupApi } from "../../services/api"
import { PublicBookmark, Category, CardGroup } from "../../types"
import { Plus, Trash2, Edit2, X, ExternalLink, Globe, FolderOpen, Search, Star } from "lucide-react"
import Favicon from "../../components/Favicon"
import ImageUploader from "../../components/ImageUploader"
import EmptyState from "../../components/EmptyState"
import PageHeader from "../../components/PageHeader"

export default function AdminBookmarks() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { toast, confirm } = useToast()
  const [groups, setGroups] = useState<CardGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [bookmarks, setBookmarks] = useState<PublicBookmark[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")

  // 子链接搜索筛选
  const [bmSearchInput, setBmSearchInput] = useState("")
  const [bmSearch, setBmSearch] = useState("")
  const [bmCategoryFilter, setBmCategoryFilter] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingBm, setEditingBm] = useState<PublicBookmark | null>(null)
  const [page, setPage] = useState(1)

  // 卡片组搜索筛选
  const [groupSearch, setGroupSearch] = useState("")
  const [groupCategoryFilter, setGroupCategoryFilter] = useState("")

  // 卡片组模态框
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<CardGroup | null>(null)
  const [groupForm, setGroupForm] = useState({ title: "", description: "", icon_url: "", is_featured: false })
  const [groupCategoryId, setGroupCategoryId] = useState("")
  const [groupNewCategory, setGroupNewCategory] = useState("")

  const pageSize = 15
  const defaultForm = { title: "", url: "", description: "", icon_url: "", category_id: "" }
  const [form, setForm] = useState(defaultForm)
  const [formGroupId, setFormGroupId] = useState("")
  const [formNewGroup, setFormNewGroup] = useState("")

  const cleanText = (value?: string | null) =>
    (value || "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\brn\b/g, "\n")
      .trim()

  useEffect(() => { loadGroups(); loadCategories() }, [])

  useEffect(() => {
    if (selectedGroupId) loadBookmarks()
  }, [selectedGroupId])

  useEffect(() => { setPage(1) }, [bmSearch, bmCategoryFilter])

  useEffect(() => {
    const timer = setTimeout(() => setBmSearch(bmSearchInput), 300)
    return () => clearTimeout(timer)
  }, [bmSearchInput])

  async function loadGroups() {
    try {
      const res = await cardGroupApi.list({})
      setGroups(res)
      setPageError("")
    } catch (err: any) { setPageError(err?.message || "加载卡片组失败") }
  }

  async function loadCategories() {
    try {
      const res = await publicCategoryApi.list()
      setCategories(res)
    } catch (err: any) { setPageError(err?.message || "加载分类失败") }
  }

  async function loadBookmarks() {
    if (!token || !selectedGroupId) return
    setLoading(true)
    try {
      const params: { group_id?: string; category_id?: string; q?: string } = { group_id: selectedGroupId }
      if (bmCategoryFilter) params.category_id = bmCategoryFilter
      if (bmSearch) params.q = bmSearch
      const res = await publicBookmarkApi.list(params)
      setBookmarks(res)
      setPageError("")
    } catch (err: any) {
      setPageError(err?.message || "加载书签失败")
      toast(err?.message || "加载书签失败", "error")
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(bookmarks.length / pageSize)
  const paged = bookmarks.slice((page - 1) * pageSize, page * pageSize)

  // 确保分类存在，不存在则创建
  async function ensureCategory(name: string): Promise<string | null> {
    if (!name || !token) return null
    const existing = categories.find(c => c.name === name)
    if (existing) return existing.id
    const created = await publicCategoryApi.create(token, { name, color: "#3b82f6" })
    await loadCategories()
    return created.id
  }

  async function ensureGroup(title: string): Promise<string | null> {
    if (!title || !token) return null
    const existing = groups.find(g => g.title === title)
    if (existing) return existing.id
    const created = await cardGroupApi.create(token, { title })
    await loadGroups()
    return created.id
  }

  async function handleSave() {
    if (!token || !form.title.trim() || !form.url.trim()) return
    let url = form.url.trim()
    if (!/^https?:\/\//i.test(url)) url = "https://" + url
    try {
      let groupId = formGroupId || selectedGroupId
      if (formNewGroup.trim() && formNewGroup !== "new") {
        const gid = await ensureGroup(formNewGroup.trim())
        if (gid) groupId = gid
      }
      const data: any = {
        title: form.title.trim(),
        url,
        description: form.description.trim() || null,
        icon_url: form.icon_url.trim() || null,
        category_id: form.category_id || null,
        group_id: groupId || null,
      }
      if (editingBm) {
        const res = await publicBookmarkApi.update(token, editingBm.id, data)
        setBookmarks(bookmarks.map(b => b.id === editingBm.id ? res : b))
      } else {
        const res = await publicBookmarkApi.create(token, data)
        setBookmarks([res, ...bookmarks])
        setSelectedGroupId(groupId)
      }
      setShowModal(false)
      setEditingBm(null)
      setForm({ ...defaultForm })
      setFormGroupId("")
      setFormNewGroup("")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleDelete(id: string) {
    if (!token || !await confirm(t("admin.bookmarks.confirmDelete"))) return
    try {
      await publicBookmarkApi.delete(token, id)
      setBookmarks(bookmarks.filter(b => b.id !== id))
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
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
    setFormGroupId(bm.group_id || "")
    setFormNewGroup("")
    setShowModal(true)
  }

  function openAdd() {
    setEditingBm(null)
    setForm({ ...defaultForm })
    setFormGroupId("")
    setFormNewGroup("")
    setShowModal(true)
  }

  async function handleSaveGroup() {
    if (!token || !groupForm.title.trim()) return
    try {
      let catId = groupCategoryId
      if (groupNewCategory.trim() && groupNewCategory !== "new") {
        catId = await ensureCategory(groupNewCategory.trim()) || ""
      }
      const data: any = { ...groupForm, is_featured: groupForm.is_featured, category_id: catId || null }
      if (editingGroup) {
        await cardGroupApi.update(token, editingGroup.id, data)
      } else {
        const res = await cardGroupApi.create(token, data)
        setSelectedGroupId(res.id)
      }
      await loadGroups()
      setShowGroupModal(false)
      setEditingGroup(null)
      setGroupForm({ title: "", description: "", icon_url: "", is_featured: false })
      setGroupCategoryId("")
      setGroupNewCategory("")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  function openAddGroup() {
    setEditingGroup(null)
    setGroupForm({ title: "", description: "", icon_url: "", is_featured: false })
    setGroupCategoryId("")
    setGroupNewCategory("")
    setShowGroupModal(true)
  }

  function openEditGroup(g: CardGroup) {
    setEditingGroup(g)
    setGroupForm({ title: g.title, description: g.description || "", icon_url: g.icon_url || "", is_featured: !!g.is_featured })
    setGroupCategoryId(g.category_id || "")
    setGroupNewCategory("")
    setShowGroupModal(true)
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  // 卡片组列表筛选
  const filteredGroups = groups.filter(g => {
    const matchSearch = !groupSearch || g.title.toLowerCase().includes(groupSearch.toLowerCase()) || (g.description && g.description.toLowerCase().includes(groupSearch.toLowerCase()))
    const matchCat = !groupCategoryFilter || g.category_id === groupCategoryFilter
    return matchSearch && matchCat
  })

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title={t("admin.bookmarks.title")} description="统一维护卡片组、公开链接与分类结构，提升导航页组织效率。" actions={
        <div className="flex gap-2">
          <button onClick={openAddGroup} className="ui-btn ui-btn-primary bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4" />新建卡片组</button>
          {selectedGroupId && (
            <button onClick={openAdd} className="ui-btn ui-btn-primary"><Plus className="w-4 h-4" />{t("admin.bookmarks.add")}</button>
          )}
        </div>
      } />
      {/* 选择/搜索卡片组 */}
      <div className="ui-card p-4 mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">选择卡片组：</label>
          <select
            value={selectedGroupId}
            onChange={(e) => { setSelectedGroupId(e.target.value); setPage(1) }}
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">-- 请选择卡片组 --</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
          {selectedGroup && (
            <button onClick={() => openEditGroup(selectedGroup)}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800/50 text-sm">
              编辑卡片组
            </button>
          )}
        </div>
        {!selectedGroupId && (
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input type="text" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="搜索卡片组..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <select value={groupCategoryFilter} onChange={(e) => setGroupCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
              <option value="">全部分类</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedGroupId ? (
        <>
          {selectedGroup && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">{selectedGroup.title}</span>
              <span className="text-sm text-blue-500">({bookmarks.length} 个子链接)</span>
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <input type="text" value={bmSearchInput} onChange={(e) => setBmSearchInput(e.target.value)}
              placeholder={t("bookmarks.search")}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <select value={bmCategoryFilter} onChange={(e) => setBmCategoryFilter(e.target.value)}
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
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 text-gray-500 dark:text-gray-400">
              <Globe className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>暂无子链接</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">ID</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">{t("bookmarks.title")}</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">{t("bookmarks.url")}</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">{t("bookmarks.category")}</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">{t("bookmarks.visitCount")}</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">{t("common.createdAt")}</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(b => (
                    <tr key={b.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{b.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Favicon src={b.icon_url} title={b.title} size="sm" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">{b.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a href={b.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {b.url.length > 40 ? b.url.slice(0, 40) + "..." : b.url}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{b.category_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">{b.visit_count ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{new Date(b.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => openEdit(b)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(b.id)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800/50">上一页</button>
              <span className="text-sm text-gray-500 dark:text-gray-400">第 {page}/{totalPages} 页</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800/50">下一页</button>
            </div>
          )}

          {/* 子链接编辑模态框 */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
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
                    <div className="flex gap-2">
                      <ImageUploader type="icon" value={form.icon_url} onChange={(url) => setForm({ ...form, icon_url: url })} className="w-12 h-12 shrink-0" />
                      <input type="text" value={form.icon_url} onChange={(e) => setForm({ ...form, icon_url: e.target.value })}
                        placeholder="https://example.com/favicon.ico"
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">所属卡片组</label>
                    <select value={formNewGroup ? "_new" : formGroupId} onChange={(e) => {
                      if (e.target.value === "_new") { setFormNewGroup("new"); setFormGroupId("") }
                      else { setFormGroupId(e.target.value); setFormNewGroup("") }
                    }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">{selectedGroup ? selectedGroup.title : "-- 选择卡片组 --"}</option>
                      <option value="_new">➕ 新建卡片组</option>
                      {groups.filter(g => g.id !== selectedGroupId).map(g => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                    {!!formNewGroup && (
                      <input type="text" value={formNewGroup === "new" ? "" : formNewGroup} onChange={(e) => setFormNewGroup(e.target.value)}
                        placeholder="输入新卡片组名称"
                        className="w-full mt-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    )}
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
                    <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800/50">{t("common.cancel")}</button>
                    <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 overflow-hidden">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>{groupSearch || groupCategoryFilter ? "未找到匹配的卡片组" : "暂无卡片组，请先创建"}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">标题</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">分类</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">描述</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">推荐</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">访问次数</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map(g => (
                  <tr key={g.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800/50 cursor-pointer" onClick={() => setSelectedGroupId(g.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{g.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{g.category_name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">{cleanText(g.description) || "-"}</td>
                    <td className="px-4 py-3 text-sm text-center">{g.is_featured ? <Star className="w-4 h-4 text-yellow-500 inline" /> : "-"}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">{g.visit_count ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={(e) => { e.stopPropagation(); openEditGroup(g) }}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 卡片组编辑模态框 */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowGroupModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{editingGroup ? "编辑卡片组" : "新建卡片组"}</h3>
              <button onClick={() => setShowGroupModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">标题</label>
                <input type="text" value={groupForm.title} onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">图标</label>
                <div className="flex gap-2">
                  <ImageUploader type="icon" value={groupForm.icon_url} onChange={(url) => setGroupForm({ ...groupForm, icon_url: url })} className="w-12 h-12 shrink-0" />
                  <input type="text" value={groupForm.icon_url} onChange={(e) => setGroupForm({ ...groupForm, icon_url: e.target.value })}
                    placeholder="https://example.com/icon.png"
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">分类</label>
                <select value={groupNewCategory ? "_new" : groupCategoryId} onChange={(e) => {
                  if (e.target.value === "_new") setGroupNewCategory("new")
                  else { setGroupCategoryId(e.target.value); setGroupNewCategory("") }
                }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">无分类</option>
                  <option value="_new">➕ 新建分类</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {!!groupNewCategory && (
                  <input type="text" value={groupNewCategory === "new" ? "" : groupNewCategory} onChange={(e) => setGroupNewCategory(e.target.value)}
                    placeholder="输入新分类名称"
                    className="w-full mt-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                )}
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
                <input type="checkbox" checked={groupForm.is_featured} onChange={(e) => setGroupForm({ ...groupForm, is_featured: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-yellow-500 focus:ring-yellow-500" />
                <Star className="w-4 h-4 text-yellow-500" />
                置顶到首页常用推荐
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowGroupModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800/50">取消</button>
                <button onClick={handleSaveGroup} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
