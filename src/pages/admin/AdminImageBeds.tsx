import { useState, useEffect } from "react"
import { useToast } from "../../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { useImagebedStore } from "../../stores/imagebedStore"
import { imagebedApi } from "../../services/api"
import { ImagebedConfig } from "../../types"
import { Plus, Trash2, Edit2, X, Server, Settings, ToggleLeft, ToggleRight } from "lucide-react"

export default function AdminImageBeds() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { toast, confirm } = useToast()
  const { configs, settings, loadConfigs, loadSettings, createConfig, updateConfig, deleteConfig, toggleConfig, updateSettings } = useImagebedStore()

  const [loading, setLoading] = useState(true)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editing, setEditing] = useState<ImagebedConfig | null>(null)
  const [form, setForm] = useState({
    name: "", endpoint: "", access_key: "", secret_key: "", bucket: "",
    region: "", custom_domain: "", path_template: "{year}/{month}/{day}/{time}_{md5}.{ext}",
    enabled: 1, is_default: 0, sort_order: 0,
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

  useEffect(() => { loadData() }, [])

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      await Promise.all([loadConfigs(token), loadSettings(token)])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveConfig() {
    if (!token || !form.name.trim() || !form.endpoint.trim() || !form.access_key.trim() || !form.secret_key.trim() || !form.bucket.trim()) return
    try {
      const data = {
        ...form,
        name: form.name.trim(),
        endpoint: form.endpoint.trim(),
        access_key: form.access_key.trim(),
        secret_key: form.secret_key.trim(),
        bucket: form.bucket.trim(),
        region: form.region.trim() || null,
        custom_domain: form.custom_domain.trim() || null,
        path_template: form.path_template.trim(),
      }
      if (editing) {
        await updateConfig(token, editing.id, data)
      } else {
        await createConfig(token, data)
      }
      setShowConfigModal(false)
      setEditing(null)
      resetForm()
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleSaveSettings() {
    if (!token) return
    try {
      await updateSettings(token, settingsForm)
      setShowSettingsModal(false)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleDelete(id: string) {
    if (!token || !await confirm("确定要删除这个图床配置吗？")) return
    try {
      await deleteConfig(token, id)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleToggle(id: string, enabled: number) {
    if (!token) return
    try {
      await toggleConfig(token, id, enabled)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  function resetForm() {
    setForm({
      name: "", endpoint: "", access_key: "", secret_key: "", bucket: "",
      region: "", custom_domain: "", path_template: "{year}/{month}/{day}/{time}_{md5}.{ext}",
      enabled: 1, is_default: 0, sort_order: 0,
    })
  }

  function openEdit(config: ImagebedConfig) {
    setEditing(config)
    setForm({
      name: config.name,
      endpoint: config.endpoint,
      access_key: config.access_key || "",
      secret_key: config.secret_key || "",
      bucket: config.bucket,
      region: config.region || "",
      custom_domain: config.custom_domain || "",
      path_template: config.path_template,
      enabled: config.enabled,
      is_default: config.is_default,
      sort_order: config.sort_order,
    })
    setShowConfigModal(true)
  }

  function openAdd() {
    setEditing(null)
    resetForm()
    setShowConfigModal(true)
  }

  function openSettings() {
    if (settings) {
      setSettingsForm({
        icon_max_width: settings.icon_max_width,
        icon_max_height: settings.icon_max_height,
        icon_quality: settings.icon_quality,
        cover_max_width: settings.cover_max_width,
        cover_max_height: settings.cover_max_height,
        cover_quality: settings.cover_quality,
        memo_max_width: settings.memo_max_width,
        memo_max_height: settings.memo_max_height,
        memo_quality: settings.memo_quality,
        avatar_max_width: settings.avatar_max_width,
        avatar_max_height: settings.avatar_max_height,
        avatar_quality: settings.avatar_quality,
        max_file_size_mb: settings.max_file_size_mb,
        allowed_formats: settings.allowed_formats,
        convert_to_webp: settings.convert_to_webp,
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">图床管理</h1>
        <div className="flex gap-2">
          <button onClick={openSettings} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <Settings className="w-4 h-4" /> 尺寸设置
          </button>
          <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" /> 添加图床
          </button>
        </div>
      </div>

      {configs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">暂无图床配置</p>
          <button onClick={openAdd} className="text-blue-600 hover:text-blue-700 font-medium">添加第一个图床</button>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => (
            <div key={config.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900">{config.name}</h3>
                    {config.is_default === 1 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">默认</span>
                    )}
                    {config.enabled === 0 && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">已禁用</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>端点: {config.endpoint}</p>
                    <p>Bucket: {config.bucket}</p>
                    {config.region && <p>Region: {config.region}</p>}
                    {config.custom_domain && <p>自定义域名: {config.custom_domain}</p>}
                    <p className="text-xs text-gray-400">路径模板: {config.path_template}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(config.id, config.enabled ? 0 : 1)}
                    className={`p-2 rounded-lg ${config.enabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                    title={config.enabled ? '禁用' : '启用'}
                  >
                    {config.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => openEdit(config)} className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(config.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{editing ? '编辑图床' : '添加图床'}</h3>
              <button onClick={() => { setShowConfigModal(false); setEditing(null); resetForm() }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">账户名称</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如: Backblaze B2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Key ID</label>
                <input type="text" value={form.access_key} onChange={(e) => setForm({ ...form, access_key: e.target.value })}
                  placeholder="例如: 003da8b2c75455c0000000001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Key</label>
                <input type="password" value={form.secret_key} onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
                  placeholder="例如: K003+UCBMmt..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bucket 名称</label>
                <input type="text" value={form.bucket} onChange={(e) => setForm({ ...form, bucket: e.target.value })}
                  placeholder="例如: my-bucket"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">区域名称</label>
                <input type="text" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder="例如: us-west-004"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">终端 URL</label>
                <input type="text" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  placeholder="例如: https://s3.us-west-004.backblazeb2.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">自定义域名</label>
                <input type="text" value={form.custom_domain} onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
                  placeholder="例如: https://files.example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">路径模板</label>
                <input type="text" value={form.path_template} onChange={(e) => setForm({ ...form, path_template: e.target.value })}
                  placeholder="{year}/{month}/{day}/{time}_{md5}.{ext}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                <p className="text-xs text-gray-400 mt-1">支持变量: {"{year}"}, {"{month}"}, {"{day}"}, {"{time}"}, {"{filename}"}, {"{ext}"}, {"{md5}"}, {"{uuid}"}, {"{type}"}, {"{user_id}"}</p>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.enabled === 1} onChange={(e) => setForm({ ...form, enabled: e.target.checked ? 1 : 0 })} />
                  <span className="text-sm text-gray-700">启用</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_default === 1} onChange={(e) => setForm({ ...form, is_default: e.target.checked ? 1 : 0 })} />
                  <span className="text-sm text-gray-700">设为默认</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => { setShowConfigModal(false); setEditing(null); resetForm() }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleSaveConfig} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">图片尺寸设置</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">图标设置</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">最大宽度</label>
                    <input type="number" value={settingsForm.icon_max_width} onChange={(e) => setSettingsForm({ ...settingsForm, icon_max_width: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">最大高度</label>
                    <input type="number" value={settingsForm.icon_max_height} onChange={(e) => setSettingsForm({ ...settingsForm, icon_max_height: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">质量 (1-100)</label>
                    <input type="number" value={settingsForm.icon_quality} onChange={(e) => setSettingsForm({ ...settingsForm, icon_quality: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">封面设置</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">最大宽度</label>
                    <input type="number" value={settingsForm.cover_max_width} onChange={(e) => setSettingsForm({ ...settingsForm, cover_max_width: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">最大高度</label>
                    <input type="number" value={settingsForm.cover_max_height} onChange={(e) => setSettingsForm({ ...settingsForm, cover_max_height: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">质量 (1-100)</label>
                    <input type="number" value={settingsForm.cover_quality} onChange={(e) => setSettingsForm({ ...settingsForm, cover_quality: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">备忘录图片设置</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">最大宽度</label>
                    <input type="number" value={settingsForm.memo_max_width} onChange={(e) => setSettingsForm({ ...settingsForm, memo_max_width: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">最大高度</label>
                    <input type="number" value={settingsForm.memo_max_height} onChange={(e) => setSettingsForm({ ...settingsForm, memo_max_height: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">质量 (1-100)</label>
                    <input type="number" value={settingsForm.memo_quality} onChange={(e) => setSettingsForm({ ...settingsForm, memo_quality: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">头像设置</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">最大宽度</label>
                    <input type="number" value={settingsForm.avatar_max_width} onChange={(e) => setSettingsForm({ ...settingsForm, avatar_max_width: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">最大高度</label>
                    <input type="number" value={settingsForm.avatar_max_height} onChange={(e) => setSettingsForm({ ...settingsForm, avatar_max_height: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">质量 (1-100)</label>
                    <input type="number" value={settingsForm.avatar_quality} onChange={(e) => setSettingsForm({ ...settingsForm, avatar_quality: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">通用设置</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">最大文件大小 (MB)</label>
                    <input type="number" value={settingsForm.max_file_size_mb} onChange={(e) => setSettingsForm({ ...settingsForm, max_file_size_mb: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">允许的图片格式</label>
                    <input type="text" value={settingsForm.allowed_formats} onChange={(e) => setSettingsForm({ ...settingsForm, allowed_formats: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={settingsForm.convert_to_webp === 1} onChange={(e) => setSettingsForm({ ...settingsForm, convert_to_webp: e.target.checked ? 1 : 0 })} />
                    <span className="text-sm text-gray-700">自动转换为 WebP 格式</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setShowSettingsModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleSaveSettings} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
