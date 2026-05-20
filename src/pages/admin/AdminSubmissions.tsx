import { useState, useEffect } from "react"
import { useToast } from "../../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../stores/authStore"
import { submissionApi, cardGroupApi } from "../../services/api"
import { Submission, CardGroup } from "../../types"
import { Check, X, Clock, ExternalLink, Globe, Send } from "lucide-react"
import Favicon from "../../components/Favicon"
import EmptyState from "../../components/EmptyState"
import PageHeader from "../../components/PageHeader"

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
                    <select
                      value={targetGroupMap[s.id] || ""}
                      onChange={(e) => setTargetGroupMap(prev => ({ ...prev, [s.id]: e.target.value }))}
                      className="text-xs border rounded px-1 py-0.5"
                    >
                      <option value="">{t("admin.submissions.createGroup")}</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
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
