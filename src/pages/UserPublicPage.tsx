import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { publicUserApi, cardGroupApi, publicMemoApi, memoApi } from "../services/api"
import { User, CardGroup } from "../types"
import { ArrowLeft, User as UserIcon, Globe, Github, Twitter, Quote, Link, Loader2, BookOpen } from "lucide-react"
import Favicon from "../components/Favicon"

export default function UserPublicPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return
    loadUser()
  }, [id])

  async function loadUser() {
    if (!id) return
    setLoading(true)
    try {
      const u = await publicUserApi.get(id)
      setUser(u)
    } catch {
      setError(t("common.notFound") || "用户不存在")
    } finally {
      setLoading(false)
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
          <ArrowLeft className="w-4 h-4" />{t("common.back") || "返回"}
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
        <ArrowLeft className="w-4 h-4" />{t("common.back") || "返回"}
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 overflow-hidden">
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
    </div>
  )
}
