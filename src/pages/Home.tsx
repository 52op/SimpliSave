import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { useBookmarkStore } from "../stores/bookmarkStore"
import { bookmarkApi, categoryApi } from "../services/api"
import { Bookmark, Category } from "../types"
import { Search, ExternalLink, Star, Folder, Globe, Clock, Zap, Grid, List } from "lucide-react"

// 搜索引擎配置
const SEARCH_ENGINES = [
  { name: "百度", url: "https://www.baidu.com/s", param: "wd", icon: "https://www.baidu.com/favicon.ico", color: "#2932e1" },
  { name: "Google", url: "https://www.google.com/search", param: "q", icon: "https://www.google.com/favicon.ico", color: "#4285f4" },
  { name: "必应", url: "https://www.bing.com/search", param: "q", icon: "https://www.bing.com/favicon.ico", color: "#008373" },
  { name: "搜狗", url: "https://www.sogou.com/web", param: "query", icon: "https://www.sogou.com/favicon.ico", color: "#fb6120" },
  { name: "360", url: "https://www.so.com/s", param: "q", icon: "https://www.so.com/favicon.ico", color: "#07a95a" },
]

export default function Home() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { bookmarks, categories, setBookmarks, setCategories } = useBookmarkStore()
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEngine, setSelectedEngine] = useState(SEARCH_ENGINES[0])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showEngines, setShowEngines] = useState(false)

  // 加载公共书签和分类
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // 获取公共书签（无需登录）
      const publicBookmarks = await bookmarkApi.listPublic()
      setBookmarks(publicBookmarks)

      // 获取分类
      if (token) {
        const catRes = await categoryApi.list(token)
        setCategories(catRes)
      }
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setLoading(false)
    }
  }

  // 搜索书签
  const filteredBookmarks = bookmarks.filter((b) => {
    const matchesSearch = !searchQuery || 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || b.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  // 按分类分组
  const groupedBookmarks = filteredBookmarks.reduce((acc, b) => {
    const catId = b.category_id || "uncategorized"
    if (!acc[catId]) acc[catId] = []
    acc[catId].push(b)
    return acc
  }, {} as Record<string, Bookmark[]>)

  // 执行搜索
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const url = `${selectedEngine.url}?${selectedEngine.param}=${encodeURIComponent(searchQuery)}`
    window.open(url, "_blank")
  }

  // 快速访问（按访问次数排序）
  const topBookmarks = [...bookmarks].sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0)).slice(0, 12)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">{t("common.loading")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 搜索区域 */}
      <div className="text-center py-12 mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">SimpliSave</h1>
        <p className="text-gray-600 mb-8">{t("app.description")}</p>
        
        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="flex">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEngines(!showEngines)}
                className="px-4 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <img src={selectedEngine.icon} alt="" className="w-4 h-4" />
                <span className="text-sm font-medium">{selectedEngine.name}</span>
              </button>
              {showEngines && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                  {SEARCH_ENGINES.map((engine) => (
                    <button
                      key={engine.name}
                      type="button"
                      onClick={() => { setSelectedEngine(engine); setShowEngines(false) }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                    >
                      <img src={engine.icon} alt="" className="w-4 h-4" />
                      <span>{engine.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`在 ${selectedEngine.name} 搜索...`}
              className="flex-1 px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              搜索
            </button>
          </div>
        </form>

        {/* 快速标签 */}
        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          {["技术", "新闻", "娱乐", "购物", "学习"].map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchQuery(tag)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 常用推荐 */}
      {topBookmarks.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-900">常用推荐</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {topBookmarks.map((b) => (
              <a
                key={b.id}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition text-center group"
              >
                {b.icon_url ? (
                  <img src={b.icon_url} alt="" className="w-10 h-10 mx-auto mb-2 rounded" />
                ) : (
                  <div className="w-10 h-10 mx-auto mb-2 bg-blue-100 rounded flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">{b.title}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 分类导航 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">分类导航</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            全部
          </button>
          {categories.filter(c => c.type === "bookmark").map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === c.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={selectedCategory === c.id ? { backgroundColor: c.color } : {}}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* 书签列表 */}
      {Object.keys(groupedBookmarks).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">暂无书签</p>
          <p className="text-sm text-gray-400">登录后可以添加私人收藏</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedBookmarks).map(([catId, items]) => {
            const category = categories.find(c => c.id === catId)
            const catName = category?.name || (catId === "uncategorized" ? "未分类" : "其他")
            const catColor = category?.color || "#3b82f6"

            return (
              <div key={catId}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-1 h-6 rounded"
                    style={{ backgroundColor: catColor }}
                  />
                  <h3 className="text-lg font-semibold text-gray-900">{catName}</h3>
                  <span className="text-sm text-gray-500">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map((b) => (
                    <a
                      key={b.id}
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition group border-l-4"
                      style={{ borderLeftColor: catColor }}
                    >
                      <div className="flex items-start gap-3">
                        {b.icon_url ? (
                          <img src={b.icon_url} alt="" className="w-8 h-8 rounded flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-blue-600">
                            {b.title}
                          </p>
                          {b.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {b.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-400 truncate">{new URL(b.url).hostname}</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 页脚 */}
      <footer className="mt-16 py-8 border-t border-gray-200">
        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">
            <a href="/bookmarks" className="text-blue-600 hover:underline">管理收藏</a>
            <span className="mx-2">|</span>
            <a href="/memos" className="text-blue-600 hover:underline">备忘录</a>
          </p>
          <p>© {new Date().getFullYear()} SimpliSave - 现代化网址导航</p>
        </div>
      </footer>
    </div>
  )
}
