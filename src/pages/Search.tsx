import { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { publicBookmarkApi, cardGroupApi } from "../services/api"
import { PublicBookmark, CardGroup } from "../types"
import { Search as SearchIcon, ExternalLink, Globe, FolderOpen, Loader2 } from "lucide-react"
import Favicon from "../components/Favicon"
import { pinyinMatch } from "../utils/pinyin"

export default function Search() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get("q") || ""
  const [input, setInput] = useState(query)
  const [loading, setLoading] = useState(false)
  const [bookmarks, setBookmarks] = useState<PublicBookmark[]>([])
  const [groups, setGroups] = useState<CardGroup[]>([])

  useEffect(() => {
    setInput(query)
    if (query.trim()) doSearch(query.trim())
    else { setBookmarks([]); setGroups([]) }
  }, [query])

  async function doSearch(q: string) {
    setLoading(true)
    try {
      const [bms, grps] = await Promise.all([
        publicBookmarkApi.list({ q }),
        cardGroupApi.list(),
      ])

      // 按 URL 去重
      const seenUrls = new Set<string>()
      const dedupedBms: PublicBookmark[] = []
      for (const b of (bms || [])) {
        if (b.url && seenUrls.has(b.url)) continue
        if (b.url) seenUrls.add(b.url)
        dedupedBms.push(b)
      }
      setBookmarks(dedupedBms)

      const matchedGroups = (grps || []).filter(g =>
        pinyinMatch(g.title, q) || (g.description && pinyinMatch(g.description, q))
      )
      setGroups(matchedGroups)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    navigate(`/search?q=${encodeURIComponent(input.trim())}`)
  }

  const hasResults = bookmarks.length > 0 || groups.length > 0

  return (
    <div className="max-w-4xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex">
          <input
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索公开子链接、卡片组..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 flex items-center gap-2">
            <SearchIcon className="w-5 h-5" />
            搜索
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        </div>
      ) : !query ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <SearchIcon className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>输入关键词搜索公开子链接和卡片组</p>
        </div>
      ) : !hasResults ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Globe className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium mb-1">未找到与 "{query}" 相关的结果</p>
          <p className="text-sm">请尝试其他关键词</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                卡片组 ({groups.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {groups.map(g => (
                  <div key={g.id} onClick={() => navigate(`/g/${g.slug}`)}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 p-4 hover:shadow-lg transition cursor-pointer border-l-4 border-blue-500">
                    <div className="flex items-center gap-3">
                      <Favicon src={g.icon_url} title={g.title} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{g.title}</p>
                        {g.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{g.description}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bookmarks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-blue-600" />
                子链接 ({bookmarks.length})
              </h2>
              <div className="space-y-2">
                {bookmarks.map(b => (
                  <div key={b.id}
                    onClick={() => (b as any).group_slug ? navigate(`/g/${(b as any).group_slug}`) : window.open(b.url, "_blank")}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30 p-4 hover:shadow-lg transition flex items-center gap-3 group cursor-pointer">
                    <Favicon src={b.icon_url} title={b.title} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600">{b.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {b.url}
                      </p>
                      {b.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{b.description}</p>}
                    </div>
                    {b.group_title && (
                      <span className="text-xs text-blue-500 dark:text-blue-400 shrink-0 flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />{b.group_title}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
