import { useState, useEffect, useRef } from "react"
import { useToast } from "../../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { submissionApi, cardGroupApi } from "../../services/api"
import { Submission, CardGroup } from "../../types"
import { Check, X, Clock, ExternalLink, Search, ChevronDown } from "lucide-react"
import Favicon from "../../components/Favicon"
import EmptyState from "../../components/EmptyState"
import PageHeader from "../../components/PageHeader"

// 可搜索的卡片组选择器，支持分类分组
function GroupSelector({ groups, value, onChange }: {
  groups: CardGroup[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = search
    ? groups.filter(g => g.title.toLowerCase().includes(search.toLowerCase()) || (g.category_name || "").toLowerCase().includes(search.toLowerCase()))
    : groups

  // 按分类分组
  const grouped = new Map<string, CardGroup[]>()
  for (const g of filtered) {
    const cat = g.category_name || "未分类"
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(g)
  }

  const selected = value ? groups.find(g => g.id === value) : null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch("") }}
        className="text-xs border rounded px-2 py-1 flex items-center gap-1 bg-white dark:bg-gray-800 min-w-[140px] max-w-[200px]"
      >
        <span className="flex-1 text-left truncate text-gray-700 dark:text-gray-300">
          {selected ? selected.title : "自动创建卡片组"}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded">
              <Search className="w-3 h-3 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索卡片组..."
                className="flex-1 bg-transparent text-xs outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 ${!value ? "text-blue-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}
            >
              自动创建卡片组
            </button>
            {Array.from(grouped.entries()).map(([cat, items]) => (
              <div key={cat}>
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/50">
                  {cat}
                </div>
                {items.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { onChange(g.id); setOpen(false) }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 truncate ${value === g.id ? "text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-gray-400 text-center">无匹配结果</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminSubmissions() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { toast, confirm } = useToast()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected">("pending")
  const [rejectReason, setRejectReason] = useState("")
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [groups, setGroups] = useState<CardGroup[]>([])
  const [targetGroupMap, setTargetGroupMap] = useState<Record<string, string>>({})

  useEffect(() => { loadData() }, [filterStatus])

  useEffect(() => {
    cardGroupApi.list({}).then(setGroups).catch(console.error)
  }, [])

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      const res = await submissionApi.list(token, filterStatus)
      setSubmissions(res)
      setPageError("")
    } catch (err: any) {
      setPageError(err?.message || "加载提交列表失败")
      toast(err?.message || "加载提交列表失败", "error")
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    if (!token) return
    try {
      await submissionApi.approve(token, id, targetGroupMap[id] || undefined)
      setSubmissions(submissions.filter(s => s.id !== id))
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleReject(id: string) {
    if (!token) return
    try {
      await submissionApi.reject(token, id, rejectReason)
      setSubmissions(submissions.filter(s => s.id !== id))
      setRejectingId(null)
      setRejectReason("")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader title={t("admin.submissions.title")} />

      <div className="flex gap-2 mb-6">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-lg font-medium ${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"}`}>
            {t(`admin.submissions.${s}`)}
          </button>
        ))}
      </div>

      {pageError ? (
        <EmptyState title="加载失败" description={pageError} tone="error" />
      ) : loading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : submissions.length === 0 ? (
        <EmptyState
          title={t("admin.submissions.noData", { status: t(`admin.submissions.${filterStatus}`) })}
          description={t("admin.submissions.noDataDesc")}
          icon={<Clock className="w-6 h-6" />}
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <div key={s.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/30 p-4">
              <div className="flex items-start gap-3">
                <Favicon src={s.icon_url} title={s.title} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{s.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColors[s.status]}`}>
                      {t(`admin.submissions.status${s.status.charAt(0).toUpperCase()}${s.status.slice(1)}`)}
                    </span>
                  </div>
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />{s.url}
                  </a>
                  {s.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.description}</p>}
                  {s.admin_note && <p className="text-xs text-red-500 mt-1">{t("admin.submissions.note", { note: s.admin_note })}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {t("admin.submissions.submitter", { info: (s as any).user_name || (s as any).user_email || s.user_id })} · {new Date(s.created_at).toLocaleString()}
                  </p>
                </div>

                {filterStatus === "pending" && (
                  <div className="flex gap-2 flex-shrink-0 items-center">
                    <GroupSelector
                      groups={groups}
                      value={targetGroupMap[s.id] || ""}
                      onChange={(id) => setTargetGroupMap(prev => ({ ...prev, [s.id]: id }))}
                    />
                    <button onClick={() => handleApprove(s.id)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm">
                      <Check className="w-4 h-4" />{t("admin.submissions.approve")}
                    </button>
                    <button onClick={() => setRejectingId(s.id)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1 text-sm">
                      <X className="w-4 h-4" />{t("admin.submissions.reject")}
                    </button>
                  </div>
                )}
              </div>

              {/* 拒绝原因输入 */}
              {rejectingId === s.id && (
                <div className="mt-3 flex gap-2">
                  <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t("admin.submissions.rejectReason")}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                  <button onClick={() => handleReject(s.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">{t("admin.submissions.confirmReject")}</button>
                  <button onClick={() => { setRejectingId(null); setRejectReason("") }}
                    className="px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">{t("admin.submissions.cancel")}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
