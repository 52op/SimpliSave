import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cardGroupApi, publicBookmarkApi, publicCategoryApi, fetchMetaApi, imagebedApi, linkReportApi } from "../services/api"
import { CardGroupDetail, Category } from "../types"
import { useAuthStore } from "../stores/authStore"
import { ExternalLink, ArrowLeft, Globe, Loader2, Pencil, Trash2, Plus, X, Wand2, ImageIcon, Flag } from "lucide-react"
import { useToast } from "../components/Toast"
import Favicon from "../components/Favicon"
import ImageUploader from "../components/ImageUploader"

interface FormBookmark {
  url: string
  title: string
  description: string
  icon_url: string
  category_id: string
}

interface FormGroup {
  title: string
  description: string
  icon_url: string
  category_id: string
}

const emptyBookmarkForm = (): FormBookmark => ({ url: "", title: "", description: "", icon_url: "", category_id: "" })

function SlidePanel({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ height: "calc(100% - 64px)" }}>{children}</div>
      </div>
    </>
  )
}

function BookmarkForm({ form, onChange, onFetchMeta, fetching, categories, token }: {
  form: FormBookmark
  onChange: (f: FormBookmark) => void
  onFetchMeta: () => void
  fetching: boolean
  categories: Category[]
  token: string | null
}) {
  const { t } = useTranslation()
  const [syncLoading, setSyncLoading] = useState(false)

  const handleSyncIcon = async () => {
    if (!token || !form.icon_url) return
    setSyncLoading(true)
    try {
      const res = await imagebedApi.uploadByUrl(token, form.icon_url, 'icon')
      onChange({ ...form, icon_url: res.public_url })
    } catch (err: any) {
      console.error("sync icon failed", err)
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
        <div className="flex gap-2">
          <input type="url" value={form.url} onChange={(e) => onChange({ ...form, url: e.target.value })}
            placeholder="https://..." className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm" />
          <button onClick={onFetchMeta} disabled={!form.url || fetching}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 flex items-center gap-1">
            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} 抓取
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.title")}</label>
        <input type="text" value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.description")}</label>
        <textarea value={form.description} onChange={(e) => onChange({ ...form, description: e.target.value })}
          rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">图标</label>
        <div className="flex items-start gap-3">
          <ImageUploader type="icon" value={form.icon_url} onChange={(url) => onChange({ ...form, icon_url: url })}
            className="w-12 h-12 shrink-0" />
          <div className="flex-1 flex gap-2">
            <input type="url" value={form.icon_url} onChange={(e) => onChange({ ...form, icon_url: e.target.value })}
              placeholder="https://..." className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm" />
            <button type="button" disabled={syncLoading || !form.icon_url} onClick={handleSyncIcon}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
              title="同步到图床">
              <Loader2 className={`w-4 h-4 ${syncLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">支持上传、拖拽、粘贴图片；远程 URL 可点击同步按钮托管到图床</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.category")}</label>
        <select value={form.category_id} onChange={(e) => onChange({ ...form, category_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm">
          <option value="">{t("common.noCategory")}</option>
          {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
      </div>
    </div>
  )
}

export default function CardGroupDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user, token } = useAuthStore()
  const isAdmin = user?.role === "admin"

  const [group, setGroup] = useState<CardGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [categories, setCategories] = useState<Category[]>([])

  // slide panel state
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<"group" | "bookmark">("bookmark")
  const [editBookmarkId, setEditBookmarkId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [syncIconLoading, setSyncIconLoading] = useState(false)

  // form state
  const [bookmarkForm, setBookmarkForm] = useState<FormBookmark>(emptyBookmarkForm())
  const [groupForm, setGroupForm] = useState<FormGroup>({ title: "", description: "", icon_url: "", category_id: "" })

  // report state
  const [reportBookmarkId, setReportBookmarkId] = useState<string | null>(null)
  const [reportType, setReportType] = useState("dead")
  const [reportDesc, setReportDesc] = useState("")
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportResult, setReportResult] = useState<{ url: string; is_alive: boolean; status_code: number | null; current_title: string } | null>(null)

  const loadGroup = useCallback(() => {
    if (!slug) return
    setLoading(true)
    cardGroupApi.getBySlug(slug)
      .then((data) => {
        setGroup(data)
        cardGroupApi.visit(data.id).catch(() => {})
      })
      .catch((err) => setError(err.message || "Not found"))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => { loadGroup() }, [loadGroup])

  useEffect(() => {
    if (isAdmin) {
      publicCategoryApi.list().then(setCategories).catch(() => {})
    }
  }, [isAdmin])

  function openAddBookmark() {
    setEditBookmarkId(null)
    setBookmarkForm({ ...emptyBookmarkForm(), category_id: group?.category_id || "" })
    setPanelMode("bookmark")
    setPanelOpen(true)
  }

  function openEditBookmark(bm: any) {
    setEditBookmarkId(bm.id)
    setBookmarkForm({
      url: bm.url || "",
      title: bm.title || "",
      description: bm.description || "",
      icon_url: bm.icon_url || "",
      category_id: bm.category_id || group?.category_id || "",
    })
    setPanelMode("bookmark")
    setPanelOpen(true)
  }

  function openEditGroup() {
    if (!group) return
    setGroupForm({
      title: group.title || "",
      description: group.description || "",
      icon_url: group.icon_url || "",
      category_id: group.category_id || "",
    })
    setPanelMode("group")
    setPanelOpen(true)
  }

  async function handleFetchMeta() {
    if (!bookmarkForm.url) return
    setFetching(true)
    try {
      const meta = await fetchMetaApi.fetch(bookmarkForm.url)
      setBookmarkForm((prev) => ({
        ...prev,
        title: prev.title || meta.title || "",
        description: prev.description || meta.description || "",
        icon_url: prev.icon_url || meta.icon || "",
      }))
    } catch (err: any) {
      toast(err.message || "抓取失败", "error")
    } finally {
      setFetching(false)
    }
  }

  async function handleSaveBookmark() {
    if (!token || !group || !bookmarkForm.title.trim() || !bookmarkForm.url.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: bookmarkForm.title.trim(),
        url: bookmarkForm.url.trim(),
        description: bookmarkForm.description.trim() || undefined,
        icon_url: bookmarkForm.icon_url.trim() || undefined,
        category_id: bookmarkForm.category_id || undefined,
        group_id: group.id,
      }
      if (editBookmarkId) {
        await publicBookmarkApi.update(token, editBookmarkId, payload)
      } else {
        await publicBookmarkApi.create(token, payload)
      }
      setPanelOpen(false)
      loadGroup()
      toast(editBookmarkId ? "链接已更新" : "链接已添加", "success")
    } catch (err: any) {
      toast(err.message || "操作失败", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveGroup() {
    if (!token || !group || !groupForm.title.trim()) return
    setSaving(true)
    try {
      await cardGroupApi.update(token, group.id, {
        title: groupForm.title.trim(),
        description: groupForm.description.trim() || undefined,
        icon_url: groupForm.icon_url.trim() || undefined,
        category_id: groupForm.category_id || undefined,
      })
      setPanelOpen(false)
      loadGroup()
      toast("卡片组已更新", "success")
    } catch (err: any) {
      toast(err.message || "更新失败", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteBookmark(id: string, title: string) {
    if (!token) return
    const ok = window.confirm(`确定删除链接"${title}"吗？`)
    if (!ok) return
    try {
      await publicBookmarkApi.delete(token, id)
      loadGroup()
      toast("链接已删除", "success")
    } catch (err: any) {
      toast(err.message || "删除失败", "error")
    }
  }

  async function handleDeleteGroup() {
    if (!token || !group) return
    const ok = window.confirm(`确定删除卡片组"${group.title}"吗？其下的所有链接也会一并删除。`)
    if (!ok) return
    try {
      await cardGroupApi.delete(token, group.id)
      toast("卡片组已删除", "success")
      navigate("/")
    } catch (err: any) {
      toast(err.message || "删除失败", "error")
    }
  }

  function openReport(bm: any) {
    setReportBookmarkId(bm.id)
    setReportType("dead")
    setReportDesc("")
    setReportResult(null)
  }

  async function handleSubmitReport() {
    if (!reportBookmarkId) return
    setReportSubmitting(true)
    setReportResult(null)
    try {
      const res = await linkReportApi.submit(reportBookmarkId, reportType, reportDesc)
      setReportResult(res)
      toast("反馈已提交，管理员将收到通知", "success")
    } catch (err: any) {
      toast(err.message || "提交失败", "error")
    } finally {
      setReportSubmitting(false)
    }
  }

  function closePanel() {
    setPanelOpen(false)
    setEditBookmarkId(null)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-20">
          <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">{error || "Not found"}</p>
          <button onClick={() => navigate("/")} className="mt-4 text-blue-600 hover:underline">← 返回首页</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-blue-600">
          <ArrowLeft className="w-4 h-4" /> 返回首页
        </button>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={openEditGroup}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Pencil className="w-4 h-4" /> 编辑
            </button>
            <button onClick={openAddBookmark}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> 添加链接
            </button>
            <button onClick={handleDeleteGroup}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="w-4 h-4" /> 删除
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/30 p-4 sm:p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
          <Favicon src={group.icon_url} title={group.title} size="lg" />
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{group.title}</h1>
            {group.description && (
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">{group.description}</p>
            )}
            {group.category_name && (
              <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded">
                {group.category_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {group.bookmarks && group.bookmarks.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">共 {group.bookmarks.length} 个链接</p>
            {isAdmin && (
              <button onClick={openAddBookmark}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                <Plus className="w-4 h-4" /> 添加链接
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {group.bookmarks.map((bm) => (
              <div key={bm.id} className="group/card relative bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/30 p-4 hover:shadow-lg transition">
                <a href={bm.url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="flex items-start gap-3">
                    <Favicon src={bm.icon_url} title={bm.title} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover/card:text-blue-600">{bm.title}</p>
                      {bm.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{bm.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {(() => { try { return new URL(bm.url).hostname } catch { return bm.url } })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
                <button onClick={(e) => { e.preventDefault(); openReport(bm) }}
                  className="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition opacity-0 group-hover/card:opacity-100"
                  title="反馈问题">
                  <Flag className="w-3.5 h-3.5" />
                </button>
                {isAdmin && (
                  <div className="absolute top-2 right-8 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.preventDefault(); openEditBookmark(bm) }}
                      className="p-1 rounded bg-white dark:bg-gray-700 shadow hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); handleDeleteBookmark(bm.id, bm.title) }}
                      className="p-1 rounded bg-white dark:bg-gray-700 shadow hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30">
          <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">暂无链接</p>
          {isAdmin && (
            <button onClick={openAddBookmark}
              className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" /> 添加第一个链接
            </button>
          )}
        </div>
      )}

      {/* edit group panel */}
      <SlidePanel open={panelOpen && panelMode === "group"} title="编辑卡片组" onClose={closePanel}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标题</label>
            <input type="text" value={groupForm.title} onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述</label>
            <textarea value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">图标</label>
            <div className="flex items-start gap-3">
              <ImageUploader type="icon" value={groupForm.icon_url} onChange={(url) => setGroupForm({ ...groupForm, icon_url: url })}
                className="w-12 h-12 shrink-0" />
              <input type="url" value={groupForm.icon_url} onChange={(e) => setGroupForm({ ...groupForm, icon_url: e.target.value })}
                placeholder="https://..." className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分类</label>
            <select value={groupForm.category_id} onChange={(e) => setGroupForm({ ...groupForm, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm">
              <option value="">无分类</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={closePanel} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">取消</button>
            <button onClick={handleSaveGroup} disabled={!groupForm.title.trim() || saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </SlidePanel>

      {/* add/edit bookmark panel */}
      <SlidePanel open={panelOpen && panelMode === "bookmark"} title={editBookmarkId ? "编辑链接" : "添加链接"} onClose={closePanel}>
        <BookmarkForm form={bookmarkForm} onChange={setBookmarkForm} onFetchMeta={handleFetchMeta} fetching={fetching} categories={categories} token={token} />
        <div className="flex gap-2 pt-4 mt-4 border-t dark:border-gray-700">
          <button onClick={closePanel} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">取消</button>
          <button onClick={handleSaveBookmark} disabled={!bookmarkForm.title.trim() || !bookmarkForm.url.trim() || saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </SlidePanel>

      {/* report modal */}
      {reportBookmarkId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setReportBookmarkId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            {!reportResult ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">反馈链接问题</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">问题类型</label>
                    {[
                      { value: "dead", label: "链接失效（打不开/404）" },
                      { value: "changed", label: "内容变更（与原内容不符）" },
                      { value: "other", label: "其他问题" },
                    ].map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 py-1.5 cursor-pointer">
                        <input type="radio" name="reportType" value={opt.value} checked={reportType === opt.value}
                          onChange={() => setReportType(opt.value)} className="accent-blue-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">问题描述（可选）</label>
                    <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} rows={3}
                      placeholder="请简单描述您遇到的问题..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-sm resize-none" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setReportBookmarkId(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">取消</button>
                    <button onClick={handleSubmitReport} disabled={reportSubmitting}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-1">
                      {reportSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      提交反馈
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">反馈已提交</h3>
                <div className="space-y-3 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">链接状态：</span>
                      {reportResult.is_alive
                        ? <span className="text-green-600 font-medium">可访问 (HTTP {reportResult.status_code})</span>
                        : <span className="text-red-500 font-medium">无法访问 (HTTP {reportResult.status_code ?? 'N/A'})</span>}
                    </div>
                    {reportResult.current_title && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">当前标题：</span>
                        <span className="text-gray-800 dark:text-gray-200">{reportResult.current_title}</span>
                      </div>
                    )}
                    <div className="text-gray-400 dark:text-gray-500 text-xs pt-1">
                      管理员将收到邮件通知，感谢您的反馈！
                    </div>
                  </div>
                  <button onClick={() => setReportBookmarkId(null)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">关闭</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
