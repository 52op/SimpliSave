import { useState, useEffect } from "react"
import { useToast } from "../../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { searchEngineApi } from "../../services/api"
import { SearchEngine } from "../../types"
import { Plus, Trash2, Edit2, Search } from "lucide-react"
import ImageUploader from "../../components/ImageUploader"
import Modal from "../../components/Modal"
import EmptyState from "../../components/EmptyState"
import PageHeader from "../../components/PageHeader"
import SectionCard from "../../components/SectionCard"

export default function AdminSearchEngines() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { toast, confirm } = useToast()
  const [engines, setEngines] = useState<SearchEngine[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")
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
      setPageError("")
    } catch (err: any) {
      setPageError(err?.message || t("admin.searchEngines.loadFailed"))
      toast(err?.message || t("admin.searchEngines.loadFailed"), "error")
    } finally { setLoading(false) }
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
        setEngines(engines.map((item) => item.id === editing.id ? res : item))
      } else {
        const res = await searchEngineApi.create(token, data)
        setEngines([...engines, res])
      }
      setShowModal(false)
      setEditing(null)
      setForm({ name: "", url: "", param: "q", icon_url: "", color: "#3b82f6", sort_order: 0, is_site_search: false })
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleDelete(id: string) {
    if (!token || !await confirm(t("admin.searchEngines.confirmDelete"))) return
    try {
      await searchEngineApi.delete(token, id)
      setEngines(engines.filter((item) => item.id !== id))
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
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
      <PageHeader
        title={t("admin.searchEngines.title")}
        description={t("admin.searchEngines.desc")}
        actions={<button onClick={openAdd} className="ui-btn ui-btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />{t("admin.searchEngines.add")}</button>}
      />

      {pageError ? <EmptyState title={t("common.error")} description={pageError} tone="error" /> : null}

      {loading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : !pageError && engines.length === 0 ? (
        <EmptyState title={t("admin.searchEngines.noData")} description={t("admin.searchEngines.noDataDesc")} icon={<Search className="w-6 h-6" />} action={<button onClick={openAdd} className="ui-btn ui-btn-primary">{t("admin.searchEngines.add")}</button>} />
      ) : (
        <div className="space-y-2">
          {engines.map((engine) => (
            <SectionCard key={engine.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {engine.icon_url ? (
                  <img src={engine.icon_url} alt="" className="w-6 h-6 rounded"
                    onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: engine.color }}>{engine.name[0]}</div>
                )}
                <div>
                  <span className="font-medium text-[var(--color-text-main)]">{engine.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)] ml-2">#{engine.sort_order}</span>
                  {engine.is_site_search ? (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{t("admin.searchEngines.siteSearch")}</span>
                  ) : (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">{engine.url}?{engine.param}=...</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(engine)} className="p-1 text-[var(--color-text-muted)] hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(engine.id)} className="p-1 text-[var(--color-text-muted)] hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <Modal show={showModal} title={editing ? t("admin.searchEngines.edit") : t("admin.searchEngines.add")} onClose={() => setShowModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("admin.searchEngines.formName")}</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("admin.searchEngines.formNamePlaceholder")} className="ui-input w-full px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("admin.searchEngines.formUrl")}</label>
            <input type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder={t("admin.searchEngines.formUrlPlaceholder")} className="ui-input w-full px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("admin.searchEngines.formParam")}</label>
            <input type="text" value={form.param} onChange={(e) => setForm({ ...form, param: e.target.value })}
              placeholder={t("admin.searchEngines.formParamPlaceholder")} className="ui-input w-full px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("admin.searchEngines.formIcon")}</label>
            <div className="flex gap-2">
              <ImageUploader type="icon" value={form.icon_url} onChange={(url) => setForm({ ...form, icon_url: url })} className="w-12 h-12 shrink-0" />
              <input type="text" value={form.icon_url} onChange={(e) => setForm({ ...form, icon_url: e.target.value })}
                placeholder={t("admin.searchEngines.formIconPlaceholder")} className="ui-input flex-1 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("admin.searchEngines.formColor")}</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full h-10 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("admin.searchEngines.formSort")}</label>
            <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              className="ui-input w-full px-3 py-2" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_site_search}
              onChange={(e) => setForm({ ...form, is_site_search: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
            {t("admin.searchEngines.siteSearchHint")}
          </label>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 ui-btn ui-btn-ghost">{t("common.cancel")}</button>
            <button onClick={handleSave} className="flex-1 ui-btn ui-btn-primary">{t("common.save")}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
