import { useState, useEffect } from "react"
import { useAuthStore } from "../../stores/authStore"
import { adminLinkReportApi } from "../../services/api"
import { LinkReport } from "../../types"
import PageHeader from "../../components/PageHeader"
import { Flag, ExternalLink, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

const problemLabels: Record<string, string> = {
  dead: "链接失效",
  changed: "内容变更",
  other: "其他问题",
}

export default function AdminLinkReports() {
  const token = useAuthStore((s) => s.token)
  const [items, setItems] = useState<LinkReport[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  useEffect(() => { load() }, [page])

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const res = await adminLinkReportApi.list(token, page, pageSize)
      setItems(res.items)
      setTotal(res.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader title="反馈管理" description={`共 ${total} 条链接反馈`} />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <Flag className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>暂无反馈</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="ui-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded ${
                      r.problem_type === "dead" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300" :
                      r.problem_type === "changed" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300" :
                      "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}>{problemLabels[r.problem_type] || r.problem_type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      r.is_alive ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300"
                    }`}>{r.is_alive ? `存活 (${r.status_code})` : `无法访问 (${r.status_code ?? "N/A"})`}</span>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{r.title}</p>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                    {r.url} <ExternalLink className="w-3 h-3" />
                  </a>
                  {r.current_title && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">当前标题: {r.current_title}</p>
                  )}
                  {r.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">描述: {r.description}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    IP: {r.reporter_ip} · {new Date(r.created_at + "Z").toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="ui-btn ui-btn-ghost disabled:opacity-30 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> 上一页
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="ui-btn ui-btn-ghost disabled:opacity-30 flex items-center gap-1">
            下一页 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
