import { useState, useEffect } from "react"
import { useToast } from "../components/Toast"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { authApi } from "../services/api"
import { authApi as authApiType } from "../services/api"
import ImageUploader from "../components/ImageUploader"
import { User, Save } from "lucide-react"

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { toast, confirm } = useToast()

  const [name, setName] = useState(user?.name || "")
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setAvatarUrl(user.avatar_url || "")
    }
  }, [user])

  async function handleSave() {
    if (!token) return
    setSaving(true)
    try {
      const res = await authApi.updateProfile(token, {
        name: name.trim() || undefined,
        avatar_url: avatarUrl || null,
      })
      setUser(res)
      toast(t("common.success") || "保存成功", "success")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">个人资料</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{user?.name}</h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">头像</label>
          <ImageUploader
            type="avatar"
            value={avatarUrl}
            onChange={setAvatarUrl}
            aspectRatio={1}
            className="w-24 h-24"
            placeholder="点击上传头像"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  )
}
