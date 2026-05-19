import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { publicMemoApi, memoApi } from "../services/api"
import { Memo } from "../types"
import { ArrowLeft, Calendar, Tag, Share2, Lock, Globe, Loader2 } from "lucide-react"

export default function MemoViewer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)

  const [memo, setMemo] = useState<Memo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    loadMemo()
  }, [id])

  async function loadMemo() {
    if (!id) return
    setLoading(true)
    try {
      let res
      if (token) {
        try { res = await memoApi.get(token, id) } catch { res = await publicMemoApi.get(id) }
      } else {
        res = await publicMemoApi.get(id)
      }
      setMemo(res)
      if (!res.share_password) setVerified(true)
    } catch {
      setError(t("memos.notFound") || "备忘录不存在或未公开")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyPassword() {
    if (!id || !password.trim()) return
    setVerifying(true)
    setPasswordError("")
    try {
      await publicMemoApi.verifyPassword(id, password)
      setVerified(true)
    } catch {
      setPasswordError(t("memos.wrongPassword") || "密码错误")
    } finally {
      setVerifying(false)
    }
  }

  async function handleShare() {
    if (!memo) return
    const url = `${window.location.origin}/memo/${memo.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement("input")
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (error || !memo) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6">
          <ArrowLeft className="w-4 h-4" />{t("common.back") || "返回"}
        </button>
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <Lock className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p>{error || t("memos.notFound")}</p>
        </div>
      </div>
    )
  }

  if (!verified) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6">
          <ArrowLeft className="w-4 h-4" />{t("common.back") || "返回"}
        </button>
        <div className="max-w-sm mx-auto mt-20 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("memos.passwordRequired") || "此备忘录需要密码"}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t("memos.enterPassword") || "请输入访问密码"}</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
            placeholder={t("memos.passwordPlaceholder") || "输入密码"}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-3"
            autoFocus
          />
          {passwordError && <p className="text-sm text-red-500 mb-3">{passwordError}</p>}
          <button
            onClick={handleVerifyPassword}
            disabled={verifying || !password.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {verifying ? t("common.loading") : t("common.confirm") || "确认"}
          </button>
        </div>
      </div>
    )
  }

  const tagsArr = typeof memo.tags === "string" ? JSON.parse(memo.tags || "[]") : (memo.tags || [])

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
          <ArrowLeft className="w-4 h-4" />{t("common.back") || "返回"}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Share2 className="w-4 h-4" />
          {copied ? (t("common.copied") || "已复制") : (t("common.share") || "分享")}
        </button>
      </div>

      <article
        className="rounded-xl shadow-lg dark:shadow-gray-900/30 overflow-hidden"
        style={{ borderTop: `4px solid ${memo.color || "#e5e7eb"}` }}
      >
        <div className="bg-white dark:bg-gray-800 p-8 md:p-12">
          {memo.category_id && (
            <div className="flex items-center gap-2 mb-4">
              {memo.is_public ? (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                  <Globe className="w-3 h-3" />{t("memos.public") || "公开"}
                </span>
              ) : null}
            </div>
          )}

          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">{memo.title}</h1>

          <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(memo.created_at).toLocaleDateString()}
            </span>
            {tagsArr.length > 0 && (
              <span className="flex items-center gap-1 flex-wrap">
                <Tag className="w-4 h-4" />
                {tagsArr.map((tag: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded text-xs">#{tag}</span>
                ))}
              </span>
            )}
          </div>

          {memo.content ? (
            <div
              className="prose prose-sm md:prose-base max-w-none dark:text-gray-300 [&_img]:rounded-lg [&_img]:shadow-sm [&_blockquote]:border-l-blue-500"
              dangerouslySetInnerHTML={{ __html: memo.content }}
            />
          ) : (
            <p className="text-gray-400 dark:text-gray-500 italic">{t("memos.noContent") || "无内容"}</p>
          )}

          <div className="mt-8 pt-6 border-t dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
            {t("memos.created") || "创建于"} {new Date(memo.created_at).toLocaleString()}
            {memo.updated_at !== memo.created_at ? ` · ${t("memos.updated") || "更新于"} ${new Date(memo.updated_at).toLocaleString()}` : ""}
          </div>
        </div>
      </article>
    </div>
  )
}
