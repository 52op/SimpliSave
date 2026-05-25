import { useState, useEffect } from "react"
import { useToast } from "../../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { siteSettingsApi } from "../../services/api"
import { useSiteSettingsStore } from "../../stores/siteSettingsStore"
import { SiteSettings } from "../../types"
import { Save, Image } from "lucide-react"
import ImageUploader from "../../components/ImageUploader"
import EmptyState from "../../components/EmptyState"
import PageHeader from "../../components/PageHeader"
import SectionCard from "../../components/SectionCard"

export default function AdminSiteSettings() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { toast, confirm } = useToast()
  const updateSiteSettings = useSiteSettingsStore((s) => s.update)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState("")

  const [form, setForm] = useState({
    site_name: "",
    description: "",
    keywords: "",
    logo_url: "",
    favicon_url: "",
    footer_html: "",
    ga_id: "",
    beian: "",
    custom_head_html: "",
    translate_api: "",
    translate_source_lang: "auto",
    translate_target_lang: "chinese",
  })

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const res = await siteSettingsApi.get()
      setSettings(res)
      setForm({
        site_name: res.site_name,
        description: res.description,
        keywords: res.keywords,
        logo_url: res.logo_url || "",
        favicon_url: res.favicon_url || "",
        footer_html: res.footer_html,
        ga_id: res.ga_id || "",
        beian: res.beian || "",
        custom_head_html: res.custom_head_html || "",
        translate_api: res.translate_api || "",
        translate_source_lang: res.translate_source_lang || "auto",
        translate_target_lang: res.translate_target_lang || "chinese",
      })
      setPageError("")
    } catch (err: any) {
      setPageError(err?.message || t("admin.siteSettings.loadFailed"))
      toast(err?.message || t("admin.siteSettings.loadFailed"), "error")
    }
    finally { setLoading(false) }
  }

  async function handleSave() {
    if (!token) return
    setSaving(true)
    try {
      const data = {
        ...form,
        logo_url: form.logo_url || null,
        favicon_url: form.favicon_url || null,
        ga_id: form.ga_id || null,
        beian: form.beian || null,
        custom_head_html: form.custom_head_html || null,
        translate_api: form.translate_api || null,
        translate_source_lang: form.translate_source_lang || null,
        translate_target_lang: form.translate_target_lang || null,
      }
      const res = await updateSiteSettings(token, data)
      setSettings(res)
      toast(t("common.success") || "保存成功", "success")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader title={t("admin.siteSettings.title")} description={t("admin.siteSettings.desc")} />
      {pageError ? <EmptyState title={t("common.error")} description={pageError} tone="error" /> : null}
      <SectionCard className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("admin.siteSettings.logo")}</label>
            <ImageUploader raw type="cover" value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} aspectRatio={1} className="w-24 h-24" />
            <input type="text" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder={t("admin.siteSettings.logoPlaceholder")} className="ui-input w-full mt-2 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("admin.siteSettings.favicon")}</label>
            <ImageUploader raw type="icon" value={form.favicon_url} onChange={(url) => setForm({ ...form, favicon_url: url })} aspectRatio={1} className="w-16 h-16" />
            <input type="text" value={form.favicon_url} onChange={(e) => setForm({ ...form, favicon_url: e.target.value })} placeholder={t("admin.siteSettings.faviconPlaceholder")} className="ui-input w-full mt-2 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.siteSettings.siteName")}</label>
          <input type="text" value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })}
            className="ui-input w-full px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.siteSettings.description")}</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2} className="ui-textarea w-full px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.siteSettings.keywords")}</label>
          <input type="text" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            className="ui-input w-full px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.siteSettings.footerHtml")}</label>
          <textarea value={form.footer_html} onChange={(e) => setForm({ ...form, footer_html: e.target.value })}
            rows={2} className="ui-textarea w-full px-3 py-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.siteSettings.gaId")}</label>
            <input type="text" value={form.ga_id} onChange={(e) => setForm({ ...form, ga_id: e.target.value })}
              placeholder={t("admin.siteSettings.gaPlaceholder")}
              className="ui-input w-full px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.siteSettings.beian")}</label>
            <input type="text" value={form.beian} onChange={(e) => setForm({ ...form, beian: e.target.value })}
              placeholder={t("admin.siteSettings.beianPlaceholder")}
              className="ui-input w-full px-3 py-2" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.siteSettings.customHead")}</label>
          <textarea value={form.custom_head_html} onChange={(e) => setForm({ ...form, custom_head_html: e.target.value })}
            rows={3} placeholder={t("admin.siteSettings.customHeadPlaceholder")}
            className="ui-textarea w-full px-3 py-2 font-mono text-sm" />
        </div>

        <div className="border-t border-[var(--color-border)] pt-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">自动翻译</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">翻译 API 地址</label>
              <input type="text" value={form.translate_api} onChange={(e) => setForm({ ...form, translate_api: e.target.value })}
                placeholder="https://translate.example.com/translate"
                className="ui-input w-full px-3 py-2" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">POST 请求，body: {`{ source_lang, target_lang, text_list }`}。留空禁用翻译功能。</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">源语言</label>
                <input type="text" value={form.translate_source_lang} onChange={(e) => setForm({ ...form, translate_source_lang: e.target.value })}
                  placeholder="auto"
                  className="ui-input w-full px-3 py-2" />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">默认 auto（自动检测）</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">目标语言</label>
                <input type="text" value={form.translate_target_lang} onChange={(e) => setForm({ ...form, translate_target_lang: e.target.value })}
                  placeholder="chinese"
                  className="ui-input w-full px-3 py-2" />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">默认 chinese</p>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="ui-btn ui-btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? t("admin.siteSettings.saving") : t("admin.siteSettings.save")}
        </button>
      </SectionCard>
    </div>
  )
}
