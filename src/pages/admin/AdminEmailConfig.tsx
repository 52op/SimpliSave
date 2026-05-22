import { useState, useEffect } from "react"
import { useAuthStore } from "../../stores/authStore"
import { emailConfigApi } from "../../services/api"
import { useToast } from "../../components/Toast"

type Provider = "resend" | "sendgrid" | "mailgun"

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "resend", label: "Resend" },
  { value: "sendgrid", label: "SendGrid" },
  { value: "mailgun", label: "Mailgun" },
]

export default function AdminEmailConfig() {
  const token = useAuthStore((s) => s.token)!
  const { toast } = useToast()

  const [provider, setProvider] = useState<Provider>("resend")
  const [apiKey, setApiKey] = useState("")
  const [fromAddress, setFromAddress] = useState("")
  const [domain, setDomain] = useState("")
  const [region, setRegion] = useState<"us" | "eu">("us")
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [testEmail, setTestEmail] = useState("")
  const [testLoading, setTestLoading] = useState(false)

  useEffect(() => {
    emailConfigApi.get(token)
      .then((cfg) => {
        if (cfg) {
          setProvider(cfg.provider || "resend")
          setFromAddress(cfg.from_address || "")
          setDomain(cfg.domain || "")
          setRegion(cfg.region || "us")
          setEnabled(cfg.enabled !== 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  async function handleSave() {
    if (!fromAddress) { toast("发件地址不能为空", "error"); return }
    if (provider === "mailgun" && !domain) { toast("Mailgun 需要填写 Domain", "error"); return }
    setSaving(true)
    try {
      await emailConfigApi.update(token, {
        provider,
        api_key: apiKey || undefined,
        from_address: fromAddress,
        domain: domain || undefined,
        region,
        enabled,
      })
      setApiKey("")
      toast("配置已保存", "success")
    } catch (err: any) {
      toast(err.message || "保存失败", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!testEmail) { toast("请填写收件地址", "error"); return }
    setTestLoading(true)
    try {
      const res = await emailConfigApi.test(token, testEmail)
      toast(res.message || "测试邮件已发送", "success")
    } catch (err: any) {
      toast(err.message || "发送失败", "error")
    } finally {
      setTestLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">邮件服务配置</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-5">
        {/* Provider 选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">服务商</label>
          <div className="flex gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setProvider(p.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  provider === p.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            API Key <span className="text-gray-400 font-normal">（留空则保持原值不变）</span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="输入新的 API Key"
            autoComplete="new-password"
          />
        </div>

        {/* 发件地址 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">发件地址</label>
          <input
            type="email"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="noreply@yourdomain.com"
          />
        </div>

        {/* Mailgun 专属字段 */}
        {provider === "mailgun" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mailgun Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="mail.yourdomain.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">区域</label>
              <div className="flex gap-2">
                {(["us", "eu"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegion(r)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      region === r
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 启用开关 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative w-10 h-6 rounded-full transition ${enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition shadow ${enabled ? "translate-x-4" : ""}`} />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">{enabled ? "已启用" : "已禁用"}</span>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存配置"}
        </button>
      </div>

      {/* 测试发送 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">测试邮件发送</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">发送一封测试验证码邮件以确认配置正确</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="收件地址"
          />
          <button
            onClick={handleTest}
            disabled={testLoading}
            className="px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 whitespace-nowrap"
          >
            {testLoading ? "发送中..." : "发送测试"}
          </button>
        </div>
      </div>
    </div>
  )
}
