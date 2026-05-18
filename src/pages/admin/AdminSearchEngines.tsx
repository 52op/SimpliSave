import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { searchEngineApi } from "../../services/api"
import { SearchEngine } from "../../types"
import { Plus, Trash2, Edit2, X, Search } from "lucide-react"
import ImageUploader from "../../components/ImageUploader"

export default function AdminSearchEngines() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const [engines, setEngines] = useState<SearchEngine[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SearchEngine | null>(null)
  const [form, setForm] = useState({
    name: "", url: "", param: "q", icon_url: "", color: "#3b82f6",
    sort_order: 0, is_site_search: false,
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await searchEngineApi.list()
      setEngines(res)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleSave() {
    if (!token || !form.name.trim() || !form.url.trim()) return
    try {
      const data: any = {
        ...form,
        name: form.name.trim(),
        url: form.url.trim(),
        param: form.param.trim(),
        icon_url: form.icon_url.trim() || null,
        is_site_search: form.is_site_search,
      }
      if (editing) {
        const res = await searchEngineApi.update(token, editing.id, data)
        setEngines(engines.map(e => e.id === editing.id ? res : e))
      } else {
        const res = await searchEngineApi.create(token, data)
        setEngines([...engines, res])
      }
      setShowModal(false)
      setEditing(null)
      setForm({ name: "", url: "", param: "q", icon_url: "", color: "#3b82f6", sort_order: 0, is_site_search: false })
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  async function handleDelete(id: string) {
    if (!token || !confirm("确定要删除这个搜索引擎吗？")) return
    try {
      await searchEngineApi.delete(token, id)
      setEngines(engines.filter(e => e.id !== id))
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  function openEdit(engine: SearchEngine) {
    setEditing(engine)
    setForm({
      name: engine.name,
      url: engine.url,
      param: engine.param,
      icon_url: engine.icon_url || "",
      color: engine.color,
      sort_order: engine.sort_order || 0,
      is_site_search: !!engine.is_site_search,
    })
    setShowModal(true)
  }

  function openAdd() {
    setEditing(null)
    setForm({ name: "", url: "", param: "q", icon_url: "", color: "#3b82f6", sort_order: 0, is_site_search: false })
    setShowModal(true)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">搜索引擎管理</h1>
        <button onClick={openAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />添加搜索引擎
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : (
        <div className="space-y-2">
          {engines.map(e => (
            <div key={e.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {e.icon_url ? (
                  <img src={e.icon_url} alt="" className="w-6 h-6 rounded"
                    onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: e.color }}>{e.name[0]}</div>
                )}
                <div>
                  <span className="font-medium">{e.name}</span>
                  <span className="text-xs text-gray-400 ml-2">#{e.sort_order}</span>
                  {e.is_site_search ? (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">站内搜索</span>
                  ) : (
                    <span className="ml-2 text-xs text-gray-400">{e.url}?{e.param}=...</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(e)} className="p-1 text-gray-500 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(e.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {engines.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>暂无搜索引擎</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{editing ? "编辑搜索引擎" : "添加搜索引擎"}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">名称</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="百度"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">搜索URL</label>
                <input type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://www.baidu.com/s"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">查询参数名</label>
                <input type="text" value={form.param} onChange={(e) => setForm({ ...form, param: e.target.value })}
                  placeholder="wd"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">图标</label>
                <div className="flex gap-2">
                  <ImageUploader type="icon" value={form.icon_url} onChange={(url) => setForm({ ...form, icon_url: url })} className="w-12 h-12 shrink-0" />
                  <input type="text" value={form.icon_url} onChange={(e) => setForm({ ...form, icon_url: e.target.value })}
                    placeholder="https://example.com/favicon.ico"
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">颜色</label>
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full h-10 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">排序</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_site_search}
                  onChange={(e) => setForm({ ...form, is_site_search: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                站内搜索（跳转到本站搜索页面）
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button>
                <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
