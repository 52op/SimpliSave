import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cardGroupApi } from "../services/api"
import { CardGroupDetail } from "../types"
import { ExternalLink, ArrowLeft, Globe, Loader2 } from "lucide-react"
import Favicon from "../components/Favicon"

export default function CardGroupDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [group, setGroup] = useState<CardGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    cardGroupApi.getBySlug(slug)
      .then((data) => {
        setGroup(data)
        cardGroupApi.visit(data.id).catch(() => {})
      })
      .catch((err) => setError(err.message || "Not found"))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-20">
          <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">{error || "Not found"}</p>
          <button onClick={() => navigate("/")} className="mt-4 text-blue-600 hover:underline">
            ← 返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <button onClick={() => navigate("/")} className="flex items-center gap-1 text-gray-500 hover:text-blue-600 mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回首页
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-4">
          <Favicon src={group.icon_url} title={group.title} size="xl" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.title}</h1>
            {group.description && (
              <p className="text-gray-500 mt-1">{group.description}</p>
            )}
            {group.category_name && (
              <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                {group.category_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {group.bookmarks && group.bookmarks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {group.bookmarks.map((bm) => (
            <a
              key={bm.id}
              href={bm.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition group"
            >
              <div className="flex items-start gap-3">
                <Favicon src={bm.icon_url} title={bm.title} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate group-hover:text-blue-600">{bm.title}</p>
                  {bm.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{bm.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400 truncate">
                      {(() => { try { return new URL(bm.url).hostname } catch { return bm.url } })()}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无链接</p>
        </div>
      )}
    </div>
  )
}
