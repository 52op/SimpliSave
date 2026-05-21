import { useState, useEffect, useCallback } from "react"
import { useToast } from "../../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { useImagebedStore } from "../../stores/imagebedStore"
import { imagebedApi } from "../../services/api"
import { ImagebedConfig } from "../../types"
import {
  Plus, Trash2, Edit2, X, Server, Settings,
  ToggleLeft, ToggleRight, Images, Copy, ZoomIn,
  ChevronLeft, ChevronRight, Check, Loader2,
} from "lucide-react"
import EmptyState from "../../components/EmptyState"
import PageHeader from "../../components/PageHeader"
import SectionCard from "../../components/SectionCard"

const FILE_TYPES = [
  { value: "", label: "全部" },
  { value: "icon", label: "图标" },
  { value: "cover", label: "封面" },
  { value: "memo", label: "备忘录" },
  { value: "avatar", label: "头像" },
]

const SIZE_LABELS: Record<string, string> = {
  icon: "图标", cover: "封面", memo: "备忘录", avatar: "头像",
}

function formatBytes(bytes?: number) {
  if (!bytes) return "-"
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`
}

export default function AdminImageBeds() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { toast, confirm } = useToast()
  const { configs, settings, loadConfigs, loadSettings, createConfig, updateConfig, deleteConfig, toggleConfig, updateSettings } = useImagebedStore()

  const [activeTab, setActiveTab] = useState<"configs" | "gallery">("configs")
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [configSaving, setConfigSaving] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editing, setEditing] = useState<ImagebedConfig | null>(null)
  const [form, setForm] = useState({
    name: "", endpoint: "", access_key: "", secret_key: "", bucket: "",
    region: "", custom_domain: "", path_template: "{year}/{month}/{day}/{time}_{md5}.{ext}",
    enabled: 1, is_default: 0, sort_order: 0, include_bucket: 1,
  })
  const [settingsForm, setSettingsForm] = useState({
    icon_max_width: 128, icon_max_height: 128, icon_quality: 80,
    cover_max_width: 800, cover_max_height: 600, cover_quality: 85,
    memo_max_width: 1200, memo_max_height: 1200, memo_quality: 85,
    avatar_max_width: 256, avatar_max_height: 256, avatar_quality: 85,
    max_file_size_mb: 10,
    allowed_formats: "image/jpeg,image/png,image/webp,image/gif",
    convert_to_webp: 1,
  })

  // 图片库状态
  const [files, setFiles] = useState<any[]>([])
  const [filesTotal, setFilesTotal] = useState(0)
  const [filesPage, setFilesPage] = useState(1)
  const [filesPageSize] = useState(48)
  const [filesLoading, setFilesLoading] = useState(false)
  const [fileType, setFileType] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (activeTab === "gallery") loadFiles()
  }, [activeTab, filesPage, fileType])

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      await Promise.all([loadConfigs(token), loadSettings(token)])
      setPageError("")
    } catch (err: any) {
      setPageError(err?.message || t("admin.imagebeds.loadFailed"))
      toast(err?.message || t("admin.imagebeds.loadFailed"), "error")
    } finally {
      setLoading(false)
    }
  }

  const loadFiles = useCallback(async () => {
    if (!token) return
    setFilesLoading(true)
    try {
      const result = await imagebedApi.listFiles(token, { page: filesPage, page_size: filesPageSize, file_type: fileType || undefined })
      setFiles(result.items)
      setFilesTotal(result.total)
    } catch (err: any) {
      toast(err.message || "加载图片失败", "error")
    } finally {
      setFilesLoading(false)
    }
  }, [token, filesPage, filesPageSize, fileType])

  function handleTypeChange(t: string) {
    setFileType(t)
    setFilesPage(1)
    setSelected(new Set())
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === files.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(files.map(f => f.id)))
    }
  }

  async function handleDeleteSelected() {
    if (!token || !selected.size) return
    if (!await confirm(`确定删除选中的 ${selected.size} 张图片？此操作将同时删除 S3 上的文件，不可恢复。`)) return
    setDeleting(true)
    try {
      await imagebedApi.batchDeleteFiles(token, Array.from(selected))
      toast(`已删除 ${selected.size} 张图片`, "success")
      setSelected(new Set())
      loadFiles()
    } catch (err: any) {
      toast(err.message || "删除失败", "error")
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteOne(id: string) {
    if (!token || !await confirm("确定删除这张图片？将同时删除 S3 上的文件，不可恢复。")) return
    try {
      await imagebedApi.deleteFile(token, id)
      toast("已删除", "success")
      setFiles(prev => prev.filter(f => f.id !== id))
      setFilesTotal(prev => prev - 1)
    } catch (err: any) {
      toast(err.message || "删除失败", "error")
    }
  }

  function handleCopy(url: string, id: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const totalPages = Math.ceil(filesTotal / filesPageSize)

  // ---- 图床配置逻辑（不变）----
  async function handleSaveConfig() {
    if (!token || configSaving || !form.name.trim() || !form.endpoint.trim() || !form.bucket.trim()) return
    if (!editing && (!form.access_key.trim() || !form.secret_key.trim())) return
    setConfigSaving(true)
    try {
      const data = {
        ...form,
        name: form.name.trim(), endpoint: form.endpoint.trim(),
        access_key: form.access_key.trim(), secret_key: form.secret_key.trim(),
        bucket: form.bucket.trim(), region: form.region.trim() || null,
        custom_domain: form.custom_domain.trim() || null,
        path_template: form.path_template.trim(),
      }
      if (editing) await updateConfig(token, editing.id, data)
      else await createConfig(token, data)
      toast(t("common.success"), "success")
      setShowConfigModal(false)
      setEditing(null)
      resetForm()
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    } finally {
      setConfigSaving(false)
    }
  }

  async function handleSaveSettings() {
    if (!token || settingsSaving) return
    setSettingsSaving(true)
    try {
      await updateSettings(token, settingsForm)
      toast(t("common.success"), "success")
      setShowSettingsModal(false)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    } finally {
      setSettingsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!token || !await confirm(t("admin.imagebeds.confirmDelete"))) return
    try { await deleteConfig(token, id) }
    catch (err: any) { toast(err.message || t("common.error"), "error") }
  }

  async function handleToggle(id: string, enabled: number) {
    if (!token) return
    try { await toggleConfig(token, id, enabled) }
    catch (err: any) { toast(err.message || t("common.error"), "error") }
  }

  function resetForm() {
    setForm({
      name: "", endpoint: "", access_key: "", secret_key: "", bucket: "",
      region: "", custom_domain: "", path_template: "{year}/{month}/{day}/{time}_{md5}.{ext}",
      enabled: 1, is_default: 0, sort_order: 0, include_bucket: 1,
    })
  }

  function openEdit(config: ImagebedConfig) {
    setEditing(config)
    setForm({
      name: config.name, endpoint: config.endpoint,
      access_key: config.access_key || "", secret_key: config.secret_key || "",
      bucket: config.bucket, region: config.region || "",
      custom_domain: config.custom_domain || "", path_template: config.path_template,
      enabled: config.enabled, is_default: config.is_default,
      sort_order: config.sort_order, include_bucket: config.include_bucket,
    })
    setShowConfigModal(true)
  }

  function openAdd() { setEditing(null); resetForm(); setShowConfigModal(true) }

  function openSettings() {
    if (settings) {
      setSettingsForm({
        icon_max_width: settings.icon_max_width, icon_max_height: settings.icon_max_height, icon_quality: settings.icon_quality,
        cover_max_width: settings.cover_max_width, cover_max_height: settings.cover_max_height, cover_quality: settings.cover_quality,
        memo_max_width: settings.memo_max_width, memo_max_height: settings.memo_max_height, memo_quality: settings.memo_quality,
        avatar_max_width: settings.avatar_max_width, avatar_max_height: settings.avatar_max_height, avatar_quality: settings.avatar_quality,
        max_file_size_mb: settings.max_file_size_mb, allowed_formats: settings.allowed_formats, convert_to_webp: settings.convert_to_webp,
      })
    }
    setShowSettingsModal(true)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title={t("admin.imagebeds.title")} description={t("admin.imagebeds.desc")} actions={
        activeTab === "configs" ? (
          <div className="flex gap-2">
            <button onClick={openSettings} className="ui-btn ui-btn-ghost">
              <Settings className="w-4 h-4" /> {t("admin.imagebeds.settings")}
            </button>
            <button onClick={openAdd} className="ui-btn ui-btn-primary">
              <Plus className="w-4 h-4" /> {t("admin.imagebeds.add")}
            </button>
          </div>
        ) : null
      } />

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab("configs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "configs"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <Server className="w-4 h-4" />
          图床配置
        </button>
        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "gallery"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <Images className="w-4 h-4" />
          图片库
          {filesTotal > 0 && activeTab === "gallery" && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
              {filesTotal}
            </span>
          )}
        </button>
      </div>

      {/* 图床配置 Tab */}
      {activeTab === "configs" && (
        <>
          {pageError ? <EmptyState title={t("common.error")} description={pageError} tone="error" /> : null}
          {!pageError && configs.length === 0 ? (
            <EmptyState
              title={t("admin.imagebeds.noData")} description={t("admin.imagebeds.noDataDesc")}
              icon={<Server className="w-6 h-6" />}
              action={<button onClick={openAdd} className="ui-btn ui-btn-primary">{t("admin.imagebeds.noDataAction")}</button>}
            />
          ) : !pageError ? (
            <div className="space-y-4">
              {configs.map((config) => (
                <SectionCard key={config.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{config.name}</h3>
                        {config.is_default === 1 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t("admin.imagebeds.defaultBadge")}</span>}
                        {config.enabled === 0 && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">{t("admin.imagebeds.disabledBadge")}</span>}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                        <p>{t("admin.imagebeds.endpoint", { value: config.endpoint })}</p>
                        <p>{t("admin.imagebeds.bucket", { value: config.bucket })}</p>
                        {config.region && <p>{t("admin.imagebeds.region", { value: config.region })}</p>}
                        {config.custom_domain && <p>{t("admin.imagebeds.customDomain", { value: config.custom_domain })}</p>}
                        <p className="text-xs text-gray-400 dark:text-gray-500">{t("admin.imagebeds.pathTemplate", { value: config.path_template })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(config.id, config.enabled ? 0 : 1)}
                        className={`p-2 rounded-lg ${config.enabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        title={config.enabled ? t("admin.imagebeds.disable") : t("admin.imagebeds.enable")}
                      >
                        {config.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => openEdit(config)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(config.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </SectionCard>
              ))}
            </div>
          ) : null}
        </>
      )}

      {/* 图片库 Tab */}
      {activeTab === "gallery" && (
        <div>
          {/* 工具栏 */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* 类型过滤 */}
            <div className="flex gap-1">
              {FILE_TYPES.map(ft => (
                <button
                  key={ft.value}
                  onClick={() => handleTypeChange(ft.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    fileType === ft.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* 全选 & 批量删除 */}
            {files.length > 0 && (
              <>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1.5"
                >
                  {selected.size === files.length ? "取消全选" : "全选当页"}
                </button>
                {selected.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    删除选中 ({selected.size})
                  </button>
                )}
              </>
            )}
          </div>

          {/* 图片网格 */}
          {filesLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : files.length === 0 ? (
            <EmptyState
              title="暂无图片记录"
              description="上传图片后，记录将显示在这里"
              icon={<Images className="w-6 h-6" />}
            />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {files.map(file => (
                <div
                  key={file.id}
                  className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    selected.has(file.id)
                      ? "border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700"
                      : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                  } bg-gray-100 dark:bg-gray-800`}
                  onClick={() => toggleSelect(file.id)}
                >
                  <img
                    src={file.public_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = '' }}
                  />

                  {/* 选中对勾 */}
                  {selected.has(file.id) && (
                    <div className="absolute top-1 left-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}

                  {/* 悬浮操作栏 */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-1.5 flex items-end justify-between">
                    <span className="text-[10px] text-white/80 leading-none truncate max-w-[60%]">
                      {SIZE_LABELS[file.file_type] || file.file_type} · {formatBytes(file.file_size)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(file.public_url, file.id) }}
                        className="p-1 rounded bg-white/20 hover:bg-white/40 text-white"
                        title="复制链接"
                      >
                        {copied === file.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewUrl(file.public_url) }}
                        className="p-1 rounded bg-white/20 hover:bg-white/40 text-white"
                        title="预览"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteOne(file.id) }}
                        className="p-1 rounded bg-red-500/80 hover:bg-red-600 text-white"
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                共 {filesTotal} 张 · 第 {filesPage} / {totalPages} 页
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilesPage(p => Math.max(1, p - 1))}
                  disabled={filesPage <= 1}
                  className="p-2 rounded-lg border border-[var(--color-border)] disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFilesPage(p => Math.min(totalPages, p + 1))}
                  disabled={filesPage >= totalPages}
                  className="p-2 rounded-lg border border-[var(--color-border)] disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 大图预览 */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewUrl}
            alt=""
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{editing ? t("admin.imagebeds.edit") : t("admin.imagebeds.add")}</h3>
              <button onClick={() => { setShowConfigModal(false); setEditing(null); resetForm() }} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.imagebeds.formName")}</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("admin.imagebeds.formNamePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.imagebeds.formAccessKey")}</label>
                <input type="text" value={form.access_key} onChange={(e) => setForm({ ...form, access_key: e.target.value })}
                  placeholder={t("admin.imagebeds.formAccessKeyPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.imagebeds.formSecretKey")}</label>
                <input type="password" value={form.secret_key} onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
                  placeholder={t("admin.imagebeds.formSecretKeyPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.imagebeds.formBucket")}</label>
                <input type="text" value={form.bucket} onChange={(e) => setForm({ ...form, bucket: e.target.value })}
                  placeholder={t("admin.imagebeds.formBucketPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.imagebeds.formRegion")}</label>
                <input type="text" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder={t("admin.imagebeds.formRegionPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.imagebeds.formEndpoint")}</label>
                <input type="text" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  placeholder={t("admin.imagebeds.formEndpointPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.imagebeds.formCustomDomain")}</label>
                <input type="text" value={form.custom_domain} onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
                  placeholder={t("admin.imagebeds.formCustomDomainPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.imagebeds.formPathTemplate")}</label>
                <input type="text" value={form.path_template} onChange={(e) => setForm({ ...form, path_template: e.target.value })}
                  placeholder="{year}/{month}/{day}/{time}_{md5}.{ext}"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("admin.imagebeds.formPathTemplateHint")}</p>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.enabled === 1} onChange={(e) => setForm({ ...form, enabled: e.target.checked ? 1 : 0 })} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t("admin.imagebeds.formEnabled")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_default === 1} onChange={(e) => setForm({ ...form, is_default: e.target.checked ? 1 : 0 })} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t("admin.imagebeds.formDefault")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.include_bucket === 1} onChange={(e) => setForm({ ...form, include_bucket: e.target.checked ? 1 : 0 })} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t("admin.imagebeds.formIncludeBucket")}</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("admin.imagebeds.formSort")}</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => { setShowConfigModal(false); setEditing(null); resetForm() }} disabled={configSaving} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">{t("common.cancel")}</button>
              <button onClick={handleSaveConfig} disabled={configSaving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{configSaving ? t("common.saving") : t("common.save")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t("admin.imagebeds.formSettingsTitle")}</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              {[
                { key: "icon", label: t("admin.imagebeds.iconSection"), w: "icon_max_width", h: "icon_max_height", q: "icon_quality" },
                { key: "cover", label: t("admin.imagebeds.coverSection"), w: "cover_max_width", h: "cover_max_height", q: "cover_quality" },
                { key: "memo", label: t("admin.imagebeds.memoSection"), w: "memo_max_width", h: "memo_max_height", q: "memo_quality" },
                { key: "avatar", label: t("admin.imagebeds.avatarSection"), w: "avatar_max_width", h: "avatar_max_height", q: "avatar_quality" },
              ].map(({ key, label, w, h, q }) => (
                <div key={key}>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{label}</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: t("admin.imagebeds.maxWidth"), field: w },
                      { label: t("admin.imagebeds.maxHeight"), field: h },
                      { label: t("admin.imagebeds.quality"), field: q },
                    ].map(({ label: fl, field }) => (
                      <div key={field}>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{fl}</label>
                        <input type="number" value={(settingsForm as any)[field]}
                          onChange={(e) => setSettingsForm({ ...settingsForm, [field]: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{t("admin.imagebeds.generalSection")}</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t("admin.imagebeds.maxFileSize")}</label>
                    <input type="number" value={settingsForm.max_file_size_mb} onChange={(e) => setSettingsForm({ ...settingsForm, max_file_size_mb: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t("admin.imagebeds.allowedFormats")}</label>
                    <input type="text" value={settingsForm.allowed_formats} onChange={(e) => setSettingsForm({ ...settingsForm, allowed_formats: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={settingsForm.convert_to_webp === 1} onChange={(e) => setSettingsForm({ ...settingsForm, convert_to_webp: e.target.checked ? 1 : 0 })} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t("admin.imagebeds.convertToWebp")}</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setShowSettingsModal(false)} disabled={settingsSaving} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">{t("common.cancel")}</button>
              <button onClick={handleSaveSettings} disabled={settingsSaving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{settingsSaving ? t("common.saving") : t("common.save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
