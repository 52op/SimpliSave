import { useState, useEffect } from "react"
import { useToast } from "../../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { publicCategoryApi } from "../../services/api"
import { Category } from "../../types"
import { Plus, Trash2, Edit2, X, Folder, ArrowUp, ArrowDown } from "lucide-react"
import ImageUploader from "../../components/ImageUploader"

export default function AdminCategories() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { toast, confirm } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)

  const [form, setForm] = useState({ name: "", icon: "", color: "#3b82f6", sort_order: 0 })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      const res = await publicCategoryApi.list()
      setCategories(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!token || !form.name.trim()) return
    try {
      if (editingCat) {
        const res = await publicCategoryApi.update(token, editingCat.id, { ...form })
        setCategories(categories.map(c => c.id === editingCat.id ? res : c))
      } else {
        await publicCategoryApi.create(token, { ...form })
        await loadData()
      }
      setShowModal(false)
      setEditingCat(null)
      setForm({ name: "", icon: "", color: "#3b82f6", sort_order: 0 })
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleMoveUp(index: number) {
    if (index <= 0 || !token) return
    const prev = categories[index - 1]
    const curr = categories[index]
    try {
      await Promise.all([
        publicCategoryApi.update(token, prev.id, { sort_order: curr.sort_order }),
        publicCategoryApi.update(token, curr.id, { sort_order: prev.sort_order }),
      ])
      await loadData()
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleMoveDown(index: number) {
    if (index >= categories.length - 1 || !token) return
    const next = categories[index + 1]
    const curr = categories[index]
    try {
      await Promise.all([
        publicCategoryApi.update(token, next.id, { sort_order: curr.sort_order }),
        publicCategoryApi.update(token, curr.id, { sort_order: next.sort_order }),
      ])
      await loadData()
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleDelete(id: string) {
    if (!token || !await confirm(t("categories.delete") + "?")) return
    try {
      await publicCategoryApi.delete(token, id)
      setCategories(categories.filter(c => c.id !== id))
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  function openEdit(cat: Category) {
    setEditingCat(cat)
    setForm({ name: cat.name, icon: cat.icon || "", color: cat.color, sort_order: cat.sort_order || 0 })
    setShowModal(true)
  }

  function openAdd() {
    setEditingCat(null)
    setForm({ name: "", icon: "", color: "#3b82f6", sort_order: 0 })
    setShowModal(true)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("categories.title")}</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />{t("categories.add")}
        </button>
      </div>



      {loading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : (
        <div className="space-y-2">
          {categories.map((c, i) => (
            <div key={c.id} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: c.color }} />
                {c.icon && <div className="w-6 h-6 flex items-center justify-center overflow-hidden [&_svg]:max-w-full [&_svg]:max-h-full" dangerouslySetInnerHTML={{ __html: c.icon }} />}
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">#{c.sort_order}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(c)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600" title="编辑"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600" title="删除"><Trash2 className="w-4 h-4" /></button>
                <span className="text-gray-200 mx-1">|</span>
                <button onClick={() => handleMoveUp(i)} disabled={i === 0}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed" title="上移"><ArrowUp className="w-4 h-4" /></button>
                <button onClick={() => handleMoveDown(i)} disabled={i === categories.length - 1}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed" title="下移"><ArrowDown className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Folder className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>暂无分类</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{editingCat ? t("categories.edit") : t("categories.add")}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("categories.name")}</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("categories.icon")} (HTML/SVG 或图片)</label>
                <div className="flex gap-2">
                  <ImageUploader type="icon" value={form.icon && form.icon.startsWith('http') ? form.icon : ''} onChange={(url) => setForm({ ...form, icon: url })} className="w-10 h-10 shrink-0" />
                  <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="<svg>...</svg> 或 https://example.com/icon.png" className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("categories.color")}</label>
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full h-10 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">排序</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button>
                <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
