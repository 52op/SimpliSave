import { useState, useEffect } from "react"
import { useToast } from "../components/Toast"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { authApi } from "../services/api"
import ImageUploader from "../components/ImageUploader"
import { User as UserIcon, Save, Globe, Github, Quote, Copy, ExternalLink } from "lucide-react"

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { toast, confirm } = useToast()

  const [name, setName] = useState(user?.name || "")
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "")
  const [bio, setBio] = useState(user?.bio || "")
  const [website, setWebsite] = useState(user?.website || "")
  const [github, setGithub] = useState(user?.github || "")
  const [twitter, setTwitter] = useState(user?.twitter || "")
  const [weibo, setWeibo] = useState(user?.weibo || "")
  const [showBio, setShowBio] = useState(!!user?.show_bio)
  const [showWebsite, setShowWebsite] = useState(!!user?.show_website)
  const [showGithub, setShowGithub] = useState(!!user?.show_github)
  const [showTwitter, setShowTwitter] = useState(!!user?.show_twitter)
  const [showWeibo, setShowWeibo] = useState(!!user?.show_weibo)
  const [saving, setSaving] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const publicUrl = user ? `${window.location.origin}/u/${user.id}` : ""

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setAvatarUrl(user.avatar_url || "")
      setBio(user.bio || "")
      setWebsite(user.website || "")
      setGithub(user.github || "")
      setTwitter(user.twitter || "")
      setWeibo(user.weibo || "")
      setShowBio(!!user.show_bio)
      setShowWebsite(!!user.show_website)
      setShowGithub(!!user.show_github)
      setShowTwitter(!!user.show_twitter)
      setShowWeibo(!!user.show_weibo)
    }
  }, [user])

  async function handleSave() {
    if (!token) return
    setSaving(true)
    try {
      const res = await authApi.updateProfile(token, {
        name: name.trim() || undefined,
        avatar_url: avatarUrl || null,
        bio: bio || null,
        website: website || null,
        github: github || null,
        twitter: twitter || null,
        weibo: weibo || null,
        show_bio: showBio ? 1 : 0,
        show_website: showWebsite ? 1 : 0,
        show_github: showGithub ? 1 : 0,
        show_twitter: showTwitter ? 1 : 0,
        show_weibo: showWeibo ? 1 : 0,
      })
      setUser(res)
      toast(t("common.success") || "保存成功", "success")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    } finally {
      setSaving(false)
    }
  }

  async function copyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch {
      const input = document.createElement("input")
      input.value = publicUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    }
  }

  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition ${checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition shadow ${checked ? "translate-x-4" : ""}`} />
      </button>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{t("profile.title") || "个人资料"}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{user?.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("profile.avatar") || "头像"}</label>
          <ImageUploader type="avatar" value={avatarUrl} onChange={setAvatarUrl} aspectRatio={1} className="w-24 h-24" placeholder={t("profile.uploadAvatar") || "点击上传头像"} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("profile.nickname") || "昵称"}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("profile.email") || "邮箱"}</label>
          <input type="email" value={user?.email || ""} disabled
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400" />
        </div>

        <div className="border-t dark:border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t("profile.publicInfo") || "公开信息"}</h3>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Quote className="w-4 h-4" />{t("profile.bio") || "个性介绍"}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{t("profile.showOnPage") || "在主页展示"}</span>
                  <Toggle checked={showBio} onChange={setShowBio} />
                </div>
              </div>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                rows={3} placeholder={t("profile.bioPlaceholder") || "介绍一下自己..."}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Globe className="w-4 h-4" />{t("profile.website") || "个人网站"}
                </label>
                <Toggle checked={showWebsite} onChange={setShowWebsite} />
              </div>
              <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Github className="w-4 h-4" />GitHub
                </label>
                <Toggle checked={showGithub} onChange={setShowGithub} />
              </div>
              <input type="text" value={github} onChange={(e) => setGithub(e.target.value)}
                placeholder="username"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X (Twitter)
                </label>
                <Toggle checked={showTwitter} onChange={setShowTwitter} />
              </div>
              <input type="text" value={twitter} onChange={(e) => setTwitter(e.target.value)}
                placeholder="username"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443z"/></svg>
                  微博
                </label>
                <Toggle checked={showWeibo} onChange={setShowWeibo} />
              </div>
              <input type="text" value={weibo} onChange={(e) => setWeibo(e.target.value)}
                placeholder="weibo username"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>

        <div className="border-t dark:border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("profile.publicPage") || "公开主页"}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t("profile.publicPageDesc") || "通过以下链接分享你的收藏和备忘录"}</p>
          <div className="flex items-center gap-2">
            <input type="text" value={publicUrl} readOnly
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-sm bg-gray-50 dark:bg-gray-800/50" />
            <button onClick={copyPublicUrl} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1">
              <Copy className="w-4 h-4" />
              {copiedUrl ? (t("common.copied") || "已复制") : (t("common.copy") || "复制")}
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? (t("common.saving") || "保存中...") : (t("common.save") || "保存")}
        </button>
      </div>
    </div>
  )
}
