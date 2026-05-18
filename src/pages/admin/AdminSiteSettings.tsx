import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { siteSettingsApi } from "../../services/api"
import { SiteSettings } from "../../types"
import { Save, Image } from "lucide-react"
import ImageUploader from "../../components/ImageUploader"

export default function AdminSiteSettings() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
      })
    } catch (err) { console.error(err) }
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
      }
      const res = await siteSettingsApi.update(token, data)
      setSettings(res)
      alert(t("common.success") || "保存成功")
    } catch (err: any) {
      alert(err.message || t("common.error"))
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">站点设置</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <ImageUploader type="cover" value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} aspectRatio={1} className="w-24 h-24" placeholder="点击上传 Logo" />
            <input type="text" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="或输入 Logo URL" className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
            <ImageUploader type="icon" value={form.favicon_url} onChange={(url) => setForm({ ...form, favicon_url: url })} aspectRatio={1} className="w-16 h-16" placeholder="点击上传 Favicon" />
            <input type="text" value={form.favicon_url} onChange={(e) => setForm({ ...form, favicon_url: e.target.value })} placeholder="或输入 Favicon URL" className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">站点名称</label>
          <input type="text" value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">站点描述</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">关键词（逗号分隔）</label>
          <input type="text" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">页脚 HTML</label>
          <textarea value={form.footer_html} onChange={(e) => setForm({ ...form, footer_html: e.target.value })}
            rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Analytics ID</label>
            <input type="text" value={form.ga_id} onChange={(e) => setForm({ ...form, ga_id: e.target.value })}
              placeholder="G-XXXXXXXXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备案号</label>
            <input type="text" value={form.beian} onChange={(e) => setForm({ ...form, beian: e.target.value })}
              placeholder="京ICP备XXXXXXXX号"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">自定义 Head HTML</label>
          <textarea value={form.custom_head_html} onChange={(e) => setForm({ ...form, custom_head_html: e.target.value })}
            rows={3} placeholder="<meta ...> / <link ...>"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? "保存中..." : "保存设置"}
        </button>
      </div>
    </div>
  )
}
