import { useState, useEffect } from "react"
import { useAuthStore } from "../../stores/authStore"
import { emailConfigApi } from "../../services/api"
import { useToast } from "../../components/Toast"
import { ExternalLink, CheckCircle2 } from "lucide-react"

type Provider = "resend" | "sendgrid" | "mailgun" | "formail" | "custom"

interface ProviderMeta {
  value: Provider
  label: string
  desc: string
  link?: string
  linkLabel?: string
}

const PROVIDERS: ProviderMeta[] = [
  {
    value: "resend",
    label: "Resend",
    desc: "现代邮件 API，开发者友好，免费额度慷慨。",
    link: "https://resend.com",
    linkLabel: "注册 Resend",
  },
  {
    value: "sendgrid",
    label: "SendGrid",
    desc: "Twilio 旗下老牌邮件服务，稳定可靠。",
    link: "https://sendgrid.com",
    linkLabel: "注册 SendGrid",
  },
  {
    value: "mailgun",
    label: "Mailgun",
    desc: "支持美区 / 欧区，企业级邮件发送服务。",
    link: "https://www.mailgun.com",
    linkLabel: "注册 Mailgun",
  },
  {
    value: "formail",
    label: "Formail",
    desc: "自托管邮件 API 服务，from 地址在 Formail 后台配置，无需在此填写。开源项目：github.com/52op/formail",
    link: "https://formail.it0731.cn",
    linkLabel: "访问 Formail",
  },
  {
    value: "custom",
    label: "自定义",
    desc: "兼容 Resend 风格的 HTTP API（POST JSON，Bearer 鉴权，body 含 from/to/subject/html）。",
  },
]

// 每个服务商的本地表单状态
interface ProviderForm {
  apiKey: string
  fromAddress: string
  domain: string
  region: "us" | "eu"
  endpointUrl: string
}

const DEFAULT_FORM: ProviderForm = {
  apiKey: "",
  fromAddress: "",
  domain: "",
  region: "us",
  endpointUrl: "",
}

export default function AdminEmailConfig() {
  const token = useAuthStore((s) => s.token)!
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null)
  // 各服务商表单数据独立存储
  const [forms, setForms] = useState<Record<Provider, ProviderForm>>({
    resend: { ...DEFAULT_FORM },
    sendgrid: { ...DEFAULT_FORM },
    mailgun: { ...DEFAULT_FORM },
    formail: { ...DEFAULT_FORM },
    custom: { ...DEFAULT_FORM },
  })
  const [savedProviders, setSavedProviders] = useState<Set<Provider>>(new Set())

  const [tab, setTab] = useState<Provider>("resend")
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState(false)

  const [testEmail, setTestEmail] = useState("")
  const [testLoading, setTestLoading] = useState(false)

  useEffect(() => {
    emailConfigApi.get(token)
      .then((list: any[]) => {
        if (!list || list.length === 0) return
        const newForms = { ...forms }
        const saved = new Set<Provider>()
        list.forEach((cfg: any) => {
          const p = cfg.provider as Provider
          newForms[p] = {
            apiKey: "",  // 不回显 api_key
            fromAddress: cfg.from_address || "",
            domain: cfg.domain || "",
            region: cfg.region || "us",
            endpointUrl: cfg.endpoint_url || "",
          }
          saved.add(p)
          if (cfg.enabled) setActiveProvider(p)
        })
        setForms(newForms)
        setSavedProviders(saved)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  function updateForm(p: Provider, patch: Partial<ProviderForm>) {
    setForms((prev) => ({ ...prev, [p]: { ...prev[p], ...patch } }))
  }

  async function handleSave() {
    const f = forms[tab]
    if (tab !== "formail" && !f.fromAddress) { toast("发件地址不能为空", "error"); return }
    if (tab === "mailgun" && !f.domain) { toast("Mailgun 需要填写 Domain", "error"); return }
    if (tab === "custom" && !f.endpointUrl) { toast("请填写自定义 Endpoint URL", "error"); return }
    setSaving(true)
    try {
      await emailConfigApi.update(token, {
        provider: tab,
        api_key: f.apiKey || undefined,
        from_address: f.fromAddress || undefined,
        domain: f.domain || undefined,
        region: f.region,
        endpoint_url: f.endpointUrl || undefined,
      })
      updateForm(tab, { apiKey: "" })
      setSavedProviders((prev) => new Set(prev).add(tab))
      toast("配置已保存", "success")
    } catch (err: any) {
      toast(err.message || "保存失败", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleActivate() {
    if (!savedProviders.has(tab)) {
      toast("请先保存该服务商的配置", "error")
      return
    }
    setActivating(true)
    try {
      await emailConfigApi.activate(token, tab)
      setActiveProvider(tab)
      toast(`已切换至 ${PROVIDERS.find((p) => p.value === tab)?.label}`, "success")
    } catch (err: any) {
      toast(err.message || "切换失败", "error")
    } finally {
      setActivating(false)
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

  const f = forms[tab]
  const meta = PROVIDERS.find((p) => p.value === tab)!
  const isActive = activeProvider === tab
  const isSaved = savedProviders.has(tab)

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">邮件服务配置</h1>
        {activeProvider && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            当前使用：{PROVIDERS.find((p) => p.value === activeProvider)?.label}
          </span>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* 服务商 Tab 切换 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setTab(p.value)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                tab === p.value
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {p.label}
              {activeProvider === p.value && (
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="当前激活" />
              )}
              {savedProviders.has(p.value) && activeProvider !== p.value && (
                <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" title="已配置" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* 服务商简介 + 链接 */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-4 py-3 flex items-start justify-between gap-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">{meta.desc}</p>
            {meta.link && (
              <a
                href={meta.link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {meta.linkLabel}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key
              {isSaved && <span className="ml-2 text-gray-400 font-normal text-xs">（留空则保持原值不变）</span>}
            </label>
            <input
              type="password"
              value={f.apiKey}
              onChange={(e) => updateForm(tab, { apiKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={tab === "formail" ? "fm_your_api_key" : "输入 API Key"}
              autoComplete="new-password"
            />
          </div>

          {/* Formail：可选覆盖实例地址 */}
          {tab === "formail" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Formail 地址 <span className="text-gray-400 font-normal text-xs">（留空使用默认 https://formail.it0731.cn）</span>
              </label>
              <input
                type="url"
                value={f.endpointUrl}
                onChange={(e) => updateForm(tab, { endpointUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://formail.it0731.cn"
              />
            </div>
          )}

          {/* 自定义 Endpoint URL */}
          {tab === "custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Endpoint URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={f.endpointUrl}
                onChange={(e) => updateForm(tab, { endpointUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://api.example.com/v1/emails"
              />
            </div>
          )}

          {/* 发件地址（formail 不需要） */}
          {tab !== "formail" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                发件地址 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={f.fromAddress}
                onChange={(e) => updateForm(tab, { fromAddress: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="noreply@yourdomain.com"
              />
            </div>
          )}

          {/* Mailgun 专属字段 */}
          {tab === "mailgun" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mailgun Domain <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={f.domain}
                  onChange={(e) => updateForm(tab, { domain: e.target.value })}
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
                      onClick={() => updateForm(tab, { region: r })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        f.region === r
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

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? "保存中..." : "保存配置"}
            </button>
            <button
              onClick={handleActivate}
              disabled={activating || isActive}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 cursor-default"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              }`}
            >
              {activating ? "切换中..." : isActive ? "✓ 当前使用中" : "切换为当前使用"}
            </button>
          </div>
        </div>
      </div>

      {/* 测试发送 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">测试邮件发送</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            使用当前激活的服务商（{activeProvider ? PROVIDERS.find((p) => p.value === activeProvider)?.label : "未设置"}）发送一封测试验证码邮件
          </p>
        </div>
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
            disabled={testLoading || !activeProvider}
            className="px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 whitespace-nowrap text-sm"
          >
            {testLoading ? "发送中..." : "发送测试"}
          </button>
        </div>
      </div>
    </div>
  )
}
