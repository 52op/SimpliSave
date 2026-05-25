import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { useSiteSettingsStore } from "../stores/siteSettingsStore"
import { emailApi } from "../services/api"
import { Link, useNavigate } from "react-router-dom"
import { Bookmark, FileText, Search, Shield } from "lucide-react"

const COOLDOWN = 60

const FEATURES = [
  { icon: Bookmark, text: "收藏喜爱的网站与资源，随时访问" },
  { icon: FileText, text: "记录想法与灵感，支持 Markdown" },
  { icon: Search, text: "聚合多引擎搜索，高效获取信息" },
  { icon: Shield, text: "数据自托管，安全私密可控" },
]

const LoginPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const siteSettings = useSiteSettingsStore((s) => s.settings)
  const login = useAuthStore((state) => state.login)
  const loginWithCode = useAuthStore((state) => state.loginWithCode)
  const error = useAuthStore((state) => state.error)
  const loading = useAuthStore((state) => state.loading)
  const clearError = useAuthStore((state) => state.clearError)
  const errorRef = useRef<HTMLDivElement>(null)

  const [tab, setTab] = useState<"password" | "code">("password")
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [codeEmail, setCodeEmail] = useState("")
  const [code, setCode] = useState("")
  const [sendLoading, setSendLoading] = useState(false)
  const [sendError, setSendError] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [codeSent, setCodeSent] = useState(false)

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  useEffect(() => () => clearError(), [clearError])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const switchTab = (t: "password" | "code") => {
    clearError()
    setSendError("")
    setTab(t)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(formData.email, formData.password)
      navigate("/")
    } catch {}
  }

  const handleSendCode = async () => {
    if (!codeEmail) { setSendError("请填写邮箱"); return }
    setSendError("")
    setSendLoading(true)
    try {
      await emailApi.sendCode(codeEmail, "login")
      setCodeSent(true)
      setCountdown(COOLDOWN)
    } catch (e: any) {
      setSendError(e.message || "发送失败")
    } finally {
      setSendLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setSendError("")
    setSendLoading(true)
    try {
      await emailApi.sendCode(codeEmail, "login")
      setCountdown(COOLDOWN)
    } catch (e: any) {
      setSendError(e.message || "发送失败")
    } finally {
      setSendLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await loginWithCode(codeEmail, code)
      navigate("/")
    } catch {}
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) clearError()
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const combinedError = error || sendError
  const isSSOMode = import.meta.env.VITE_AUTH_MODE === 'sso'
  const ssoUrl = import.meta.env.VITE_SSO_URL as string | undefined

  // SSO 模式：直接跳转到统一认证站
  if (isSSOMode && ssoUrl) {
    const redirectTo = `${ssoUrl}/login?redirect=${encodeURIComponent(window.location.origin)}`
    return (
      <div className="py-10 flex items-center justify-center">
        <div className="ui-card p-10 text-center max-w-sm w-full">
          <div className="w-14 h-14 bg-[var(--color-primary-weak)] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Shield className="w-7 h-7 text-[var(--color-primary)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-2">统一账号登录</h2>
          <p className="text-[var(--color-text-muted)] text-sm mb-6">本站已接入统一认证，点击下方按钮跳转到认证中心完成登录</p>
          <a
            href={redirectTo}
            className="ui-btn ui-btn-primary w-full py-3 block"
          >
            前往统一认证登录
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="py-10 flex items-center justify-center">
      <div className="w-full max-w-4xl flex rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-2xl">
        {/* 左侧特性面板 */}
        <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 text-white p-12 w-5/12 relative overflow-hidden shrink-0">
          <div className="auth-blob w-72 h-72 bg-white/20 -top-12 -right-12" style={{ opacity: 0.15 }} />
          <div className="auth-blob w-48 h-48 bg-white/20 bottom-4 -left-8" style={{ opacity: 0.1 }} />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <h2 className="text-3xl font-bold mb-3">{siteSettings?.site_name || "SimpliSave"}</h2>
            <p className="text-blue-100 mb-10 leading-relaxed">{siteSettings?.description || t("app.description")}</p>
            <ul className="space-y-5">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-blue-100">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 右侧表单 */}
        <div className="flex-1 bg-[var(--color-surface)] p-8 lg:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-1">欢迎回来</h1>
            <p className="text-[var(--color-text-muted)] text-sm">请登录你的账号</p>
          </div>

          {/* Tab 切换 */}
          <div className="flex rounded-lg bg-[var(--color-surface-2)] p-1 mb-6">
            <button
              type="button"
              onClick={() => switchTab("password")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === "password" ? "bg-[var(--color-surface)] text-[var(--color-text-main)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"}`}
            >
              密码登录
            </button>
            <button
              type="button"
              onClick={() => switchTab("code")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === "code" ? "bg-[var(--color-surface)] text-[var(--color-text-main)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"}`}
            >
              验证码登录
            </button>
          </div>

          {combinedError && (
            <div ref={errorRef} tabIndex={-1} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 mb-5">
              {combinedError}
            </div>
          )}

          {tab === "password" ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">{t("auth.email")}</label>
                <input type="email" name="email" required value={formData.email} onChange={handleChange} className="ui-input px-4 py-3" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">{t("auth.password")}</label>
                <input type="password" name="password" required value={formData.password} onChange={handleChange} className="ui-input px-4 py-3" placeholder="请输入密码" />
              </div>
              <button type="submit" disabled={loading} className="ui-btn ui-btn-primary w-full py-3 disabled:opacity-50">
                {loading ? t("auth.signingIn") || "Signing in..." : t("auth.login")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">{t("auth.email")}</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={codeEmail}
                    onChange={(e) => { setSendError(""); setCodeEmail(e.target.value) }}
                    className="ui-input px-4 py-3 flex-1"
                    placeholder="you@example.com"
                    disabled={codeSent}
                  />
                  {codeSent && (
                    <button type="button" onClick={() => { setCodeSent(false); setCode("") }} className="ui-btn ui-btn-secondary px-3 text-sm">修改</button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => { if (error) clearError(); setCode(e.target.value) }}
                    className="ui-input px-4 py-3 flex-1 tracking-widest text-center text-lg"
                    placeholder="6 位验证码"
                  />
                  <button
                    type="button"
                    onClick={codeSent ? handleResend : handleSendCode}
                    disabled={sendLoading || (codeSent && countdown > 0)}
                    className="ui-btn ui-btn-secondary px-3 py-2 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {sendLoading ? "发送中..." : codeSent && countdown > 0 ? `${countdown}s` : codeSent ? "重新发送" : "发送验证码"}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading || !codeSent} className="ui-btn ui-btn-primary w-full py-3 disabled:opacity-50">
                {loading ? t("auth.signingIn") || "Signing in..." : t("auth.login")}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
            {t("auth.noAccount")} <Link to="/register" className="text-[var(--color-primary)] font-medium">{t("auth.register")}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
