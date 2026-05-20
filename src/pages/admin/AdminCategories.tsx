import { useState, useEffect } from "react"
import { useToast } from "../../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { publicCategoryApi } from "../../services/api"
import { Category } from "../../types"
import { Plus, Trash2, Edit2, Folder, ArrowUp, ArrowDown } from "lucide-react"
import ImageUploader from "../../components/ImageUploader"
import Modal from "../../components/Modal"
import EmptyState from "../../components/EmptyState"
import PageHeader from "../../components/PageHeader"
import SectionCard from "../../components/SectionCard"

export default function AdminCategories() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { toast, confirm } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")
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
      setPageError("")
    } catch (err: any) {
      setPageError(err?.message || t("admin.categories.loadFailed"))
      toast(err?.message || t("admin.categories.loadFailed"), "error")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!token || !form.name.trim()) return
    try {
      if (editingCat) {
        const res = await publicCategoryApi.update(token, editingCat.id, { ...form })
        setCategories(categories.map((item) => item.id === editingCat.id ? res : item))
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
      setCategories(categories.filter((item) => item.id !== id))
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
      <PageHeader title={t("categories.title")} description={t("admin.categories.desc")} actions={<button onClick={openAdd} className="ui-btn ui-btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />{t("categories.add")}</button>} />
      {pageError ? <EmptyState title={t("common.error")} description={pageError} tone="error" /> : null}

      {loading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : !pageError && categories.length === 0 ? (
        <EmptyState title={t("admin.categories.noData")} description={t("admin.categories.noDataDesc")} icon={<Folder className="w-6 h-6" />} action={<button onClick={openAdd} className="ui-btn ui-btn-primary">{t("categories.add")}</button>} />
      ) : (
        <div className="space-y-2">
          {categories.map((category, index) => (
            <SectionCard key={category.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: category.color }} />
                {category.icon && <div className="w-6 h-6 flex items-center justify-center overflow-hidden [&_svg]:max-w-full [&_svg]:max-h-full" dangerouslySetInnerHTML={{ __html: category.icon }} />}
                <span className="font-medium text-[var(--color-text-main)]">{category.name}</span>
                <span className="text-xs text-[var(--color-text-muted)]">#{category.sort_order}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(category)} className="p-1 text-[var(--color-text-muted)] hover:text-blue-600" title={t("common.edit")}><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(category.id)} className="p-1 text-[var(--color-text-muted)] hover:text-red-600" title={t("common.delete")}><Trash2 className="w-4 h-4" /></button>
                <span className="text-[var(--color-border)] mx-1">|</span>
                <button onClick={() => handleMoveUp(index)} disabled={index === 0}
                  className="p-1 text-[var(--color-text-muted)] hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed" title={t("common.prevPage")}><ArrowUp className="w-4 h-4" /></button>
                <button onClick={() => handleMoveDown(index)} disabled={index === categories.length - 1}
                  className="p-1 text-[var(--color-text-muted)] hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed" title={t("common.nextPage")}><ArrowDown className="w-4 h-4" /></button>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <Modal show={showModal} title={editingCat ? t("categories.edit") : t("categories.add")} onClose={() => setShowModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("categories.name")}</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="ui-input w-full px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("categories.icon")} {t("admin.categories.iconHint")}</label>
            <div className="flex gap-2">
              <ImageUploader type="icon" value={form.icon && form.icon.startsWith('http') ? form.icon : ''} onChange={(url) => setForm({ ...form, icon: url })} className="w-10 h-10 shrink-0" />
              <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="<svg>...</svg> 或 https://example.com/icon.png" className="ui-input flex-1 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("categories.color")}</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full h-10 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("admin.categories.sortOrder")}</label>
            <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="ui-input w-full px-3 py-2" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 ui-btn ui-btn-ghost">{t("common.cancel")}</button>
            <button onClick={handleSave} className="flex-1 ui-btn ui-btn-primary">{t("common.save")}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
