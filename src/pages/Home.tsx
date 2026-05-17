import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { cardGroupApi, publicCategoryApi, submissionApi, fetchMetaApi } from "../services/api"
import { CardGroup, Category } from "../types"
import { Search, ExternalLink, Folder, Globe, Zap, Send, Loader2, X } from "lucide-react"
import Favicon from "../components/Favicon"
import { useNavigate } from "react-router-dom"

const SEARCH_ENGINES = [
  { name: "百度", url: "https://www.baidu.com/s", param: "wd", icon: "https://www.baidu.com/favicon.ico", color: "#2932e1" },
  { name: "Google", url: "https://www.google.com/search", param: "q", icon: "https://www.google.com/favicon.ico", color: "#4285f4" },
  { name: "必应", url: "https://www.bing.com/search", param: "q", icon: "https://www.bing.com/favicon.ico", color: "#008373" },
  { name: "搜狗", url: "https://www.sogou.com/web", param: "query", icon: "https://www.sogou.com/favicon.ico", color: "#fb6120" },
  { name: "360", url: "https://www.so.com/s", param: "q", icon: "https://www.so.com/favicon.ico", color: "#07a95a" },
]

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)

  const [loading, setLoading] = useState(true)
  const [cardGroups, setCardGroups] = useState<CardGroup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEngine, setSelectedEngine] = useState(SEARCH_ENGINES[0])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showEngines, setShowEngines] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitForm, setSubmitForm] = useState({ url: "", title: "", description: "" })
  const [submitting, setSubmitting] = useState(false)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [groups, cats] = await Promise.all([
        cardGroupApi.list(),
        publicCategoryApi.list(),
      ])
      setCardGroups(groups)
      setCategories(cats)
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredGroups = cardGroups.filter((g) => {
    const matchesSearch = !searchQuery || 
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || g.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedGroups = filteredGroups.reduce((acc, g) => {
    const catId = g.category_id || "uncategorized"
    if (!acc[catId]) acc[catId] = []
    acc[catId].push(g)
    return acc
  }, {} as Record<string, CardGroup[]>)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const url = `${selectedEngine.url}?${selectedEngine.param}=${encodeURIComponent(searchQuery)}`
    window.open(url, "_blank")
  }

  const topGroups = [...cardGroups].sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0)).slice(0, 12)

  async function handleSubmitLink() {
    if (!token) { alert("请先登录"); return }
    if (!submitForm.url.trim() || !submitForm.title.trim()) return
    setSubmitting(true)
    try {
      await submissionApi.create(token, submitForm)
      alert("提交成功！等待管理员审核")
      setShowSubmitModal(false)
      setSubmitForm({ url: "", title: "", description: "" })
    } catch (err: any) {
      alert(err.message || "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFetchMeta() {
    if (!submitForm.url.trim()) return
    setFetching(true)
    try {
      const meta = await fetchMetaApi.fetch(submitForm.url)
      setSubmitForm(prev => ({
        ...prev,
        title: meta.title || prev.title,
        description: meta.description || prev.description,
      }))
    } catch (err: any) {
      alert("抓取失败: " + (err.message || "请手动填写"))
    } finally {
      setFetching(false)
    }
  }

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
      {topGroups.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-900">常用推荐</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {topGroups.map((g) => (
              <a
                key={g.id}
                href={`/g/${g.slug}`}
                onClick={(e) => { e.preventDefault(); navigate(`/g/${g.slug}`) }}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition text-center group"
              >
                <Favicon src={g.icon_url} title={g.title} size="lg" />
                <p className="text-sm font-medium text-gray-900 truncate mt-2 group-hover:text-blue-600">{g.title}</p>
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
          {categories.map((c) => (
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

      {/* 卡片组列表 */}
      {Object.keys(groupedGroups).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">暂无卡片组</p>
          <p className="text-sm text-gray-400">登录后可以添加私人收藏</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedGroups).map(([catId, items]) => {
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
                  {items.map((g) => (
                    <a
                      key={g.id}
                      href={`/g/${g.slug}`}
                      onClick={(e) => { e.preventDefault(); navigate(`/g/${g.slug}`) }}
                      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition group border-l-4"
                      style={{ borderLeftColor: catColor }}
                    >
                      <div className="flex items-start gap-3">
                        <Favicon src={g.icon_url} title={g.title} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-blue-600">{g.title}</p>
                          {g.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{g.description}</p>
                          )}
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
            {token && (
              <>
                <span className="mx-2">|</span>
                <button onClick={() => setShowSubmitModal(true)} className="text-blue-600 hover:underline">
                  <Send className="w-3 h-3 inline mr-1" />提交链接
                </button>
              </>
            )}
          </p>
          <p>© {new Date().getFullYear()} SimpliSave - 现代化网址导航</p>
        </div>
      </footer>

      {/* 提交链接 Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowSubmitModal(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">提交链接</h3>
              <button onClick={() => setShowSubmitModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">网址</label>
                <div className="flex gap-2">
                  <input type="url" value={submitForm.url}
                    onChange={(e) => setSubmitForm({ ...submitForm, url: e.target.value })}
                    placeholder="https://example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button onClick={handleFetchMeta} disabled={fetching || !submitForm.url.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                    {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {fetching ? "抓取中..." : "抓取"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input type="text" value={submitForm.title}
                  onChange={(e) => setSubmitForm({ ...submitForm, title: e.target.value })}
                  placeholder="网站标题"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
                <textarea value={submitForm.description}
                  onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
                  placeholder="简短描述..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowSubmitModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
                <button onClick={handleSubmitLink} disabled={submitting || !submitForm.url || !submitForm.title}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? "提交中..." : "提交"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
