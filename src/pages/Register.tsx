import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
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

const RegisterPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const register = useAuthStore((state) => state.register)
  const error = useAuthStore((state) => state.error)
  const loading = useAuthStore((state) => state.loading)
  const clearError = useAuthStore((state) => state.clearError)
  const setError = useAuthStore((state) => state.setError)
  const errorRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState("")
  const [formData, setFormData] = useState({ name: "", password: "", confirmPassword: "", code: "" })
  const [sendLoading, setSendLoading] = useState(false)
  const [sendError, setSendError] = useState("")
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  useEffect(() => () => clearError(), [clearError])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendCode = async () => {
    if (!email) { setSendError("请填写邮箱"); return }
    setSendError("")
    setSendLoading(true)
    try {
      await emailApi.sendCode(email, "register")
      setStep(2)
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
      await emailApi.sendCode(email, "register")
      setCountdown(COOLDOWN)
    } catch (e: any) {
      setSendError(e.message || "发送失败")
    } finally {
      setSendLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError("两次密码不一致")
      return
    }
    try {
      await register(formData.name, email, formData.password, formData.code)
      navigate("/")
    } catch {}
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) clearError()
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const isSSOMode = import.meta.env.VITE_AUTH_MODE === 'sso'
  const ssoUrl = import.meta.env.VITE_SSO_URL as string | undefined

  if (isSSOMode && ssoUrl) {
    return (
      <div className="py-10 flex items-center justify-center">
        <div className="ui-card p-10 text-center max-w-sm w-full">
          <div className="w-14 h-14 bg-[var(--color-primary-weak)] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Shield className="w-7 h-7 text-[var(--color-primary)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-2">注册账号</h2>
          <p className="text-[var(--color-text-muted)] text-sm mb-6">本站已接入统一认证，请前往认证中心注册账号</p>
          <a href={`${ssoUrl}/register`} className="ui-btn ui-btn-primary w-full py-3 block">前往认证中心注册</a>
          <div className="mt-4 text-sm text-[var(--color-text-muted)]">已有账号？<Link to="/login" className="text-[var(--color-primary)] font-medium">直接登录</Link></div>
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
            <h2 className="text-3xl font-bold mb-3">SimpliSave</h2>
            <p className="text-blue-100 mb-10 leading-relaxed">{t("app.description")}</p>
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
            <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-1">创建账号</h1>
            <p className="text-[var(--color-text-muted)] text-sm">
              {step === 1 ? "输入邮箱，我们将发送验证码" : `验证码已发送至 ${email}`}
            </p>
          </div>

          {step === 1 ? (
            <div className="space-y-5">
              {sendError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {sendError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">{t("auth.email")}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setSendError(""); setEmail(e.target.value) }}
                  className="ui-input px-4 py-3"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendLoading}
                className="ui-btn ui-btn-primary w-full py-3 disabled:opacity-50"
              >
                {sendLoading ? "发送中..." : "发送验证码"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {(error || sendError) && (
                <div ref={errorRef} tabIndex={-1} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {error || sendError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="code"
                    required
                    maxLength={6}
                    value={formData.code}
                    onChange={handleChange}
                    className="ui-input px-4 py-3 flex-1 tracking-widest text-center text-lg"
                    placeholder="6 位验证码"
                  />
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={countdown > 0 || sendLoading}
                    className="ui-btn ui-btn-secondary px-3 py-2 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {countdown > 0 ? `${countdown}s` : "重新发送"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">{t("auth.name")}</label>
                <input type="text" name="name" required value={formData.name} onChange={handleChange} className="ui-input px-4 py-3" placeholder={t("auth.name")} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">{t("auth.password")}</label>
                <input type="password" name="password" required value={formData.password} onChange={handleChange} className="ui-input px-4 py-3" placeholder="请输入密码（至少 6 位）" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">{t("auth.confirmPassword")}</label>
                <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} className="ui-input px-4 py-3" placeholder="请再次输入密码" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setStep(1); clearError() }} className="ui-btn ui-btn-ghost px-4 py-3">
                  上一步
                </button>
                <button type="submit" disabled={loading} className="ui-btn ui-btn-primary flex-1 py-3 disabled:opacity-50">
                  {loading ? t("auth.creatingAccount") || "Creating account..." : t("auth.register")}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
            {t("auth.haveAccount")} <Link to="/login" className="text-[var(--color-primary)] font-medium">{t("auth.login")}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
