import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { emailApi } from "../services/api"
import { Link, useNavigate } from "react-router-dom"

const COOLDOWN = 60

const LoginPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4">
      <div className="ui-card max-w-md w-full p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[var(--color-text-main)] mb-2">SimpliSave</h1>
          <p className="text-[var(--color-text-muted)]">{t("app.description")}</p>
        </div>

        {/* Tab 切换 */}
        <div className="flex rounded-lg bg-[var(--color-bg-secondary)] p-1 mb-6">
          <button
            type="button"
            onClick={() => switchTab("password")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === "password" ? "bg-white dark:bg-slate-700 text-[var(--color-text-main)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"}`}
          >
            密码登录
          </button>
          <button
            type="button"
            onClick={() => switchTab("code")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === "code" ? "bg-white dark:bg-slate-700 text-[var(--color-text-main)] shadow-sm" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"}`}
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
  )
}

export default LoginPage
