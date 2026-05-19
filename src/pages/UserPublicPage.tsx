import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { publicUserApi } from "../services/api"
import { ArrowLeft, User as UserIcon, Globe, Github, Quote, Loader2, BookOpen, FileText, Calendar, Tag } from "lucide-react"
import type { Memo } from "../types"

export default function UserPublicPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [user, setUser] = useState<any>(null)
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [memosLoading, setMemosLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return
    loadUser()
    loadMemos()
  }, [id])

  async function loadUser() {
    if (!id) return
    try {
      const u = await publicUserApi.get(id)
      setUser(u)
    } catch {
      setError(t("common.notFound") || "用户不存在")
    } finally {
      setLoading(false)
    }
  }

  async function loadMemos() {
    if (!id) return
    setMemosLoading(true)
    try {
      const res = await publicUserApi.listMemos(id)
      setMemos(res || [])
    } catch {
    } finally {
      setMemosLoading(false)
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

  if (error || !user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6">
          <ArrowLeft className="w-4 h-4" />{t("common.back")}
        </button>
        <div className="text-center py-20">
          <UserIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate("/")} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6">
        <ArrowLeft className="w-4 h-4" />{t("common.back")}
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-32" />
        <div className="px-8 pb-8">
          <div className="-mt-16 mb-6 flex items-end gap-4">
            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-lg">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div className="pb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{user.id?.slice(0, 8)}</p>
            </div>
          </div>

          {user.show_bio && user.bio && (
            <div className="flex items-start gap-2 mb-4 text-gray-600 dark:text-gray-400">
              <Quote className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{user.bio}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {user.show_website && user.website && (
              <a href={user.website.startsWith("http") ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                <Globe className="w-4 h-4" />{user.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {user.show_github && user.github && (
              <a href={user.github.startsWith("http") ? user.github : `https://github.com/${user.github}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <Github className="w-4 h-4" />{user.github.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
              </a>
            )}
            {user.show_twitter && user.twitter && (
              <a href={user.twitter.startsWith("http") ? user.twitter : `https://twitter.com/${user.twitter}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                {user.twitter.replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//, "")}
              </a>
            )}
            {user.show_weibo && user.weibo && (
              <a href={user.weibo.startsWith("http") ? user.weibo : `https://weibo.com/${user.weibo}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-500">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443z"/></svg>
                {user.weibo.replace(/^https?:\/\/(www\.)?weibo\.com\//, "")}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("memos.title")}</h2>
      </div>

      {memosLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : memos.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3" />
          <p>{t("memos.noMemos")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {memos.map((memo) => (
            <button
              key={memo.id}
              onClick={() => navigate(`/memo/${memo.id}`)}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 p-5 hover:shadow-md transition cursor-pointer"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{memo.title}</h3>
              {memo.content && (
                <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: memo.content }} />
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(memo.created_at).toLocaleDateString()}</span>
                {memo.tags && typeof memo.tags === "string" && JSON.parse(memo.tags).length > 0 && (
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{JSON.parse(memo.tags).slice(0, 3).join(", ")}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
