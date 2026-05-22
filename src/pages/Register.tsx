import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { emailApi } from "../services/api"
import { Link, useNavigate } from "react-router-dom"

const COOLDOWN = 60

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4">
      <div className="ui-card max-w-md w-full p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[var(--color-text-main)] mb-2">SimpliSave</h1>
          <p className="text-[var(--color-text-muted)]">{t("app.description")}</p>
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
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <span>验证码已发送至 <strong className="text-[var(--color-text-main)]">{email}</strong></span>
              <button type="button" onClick={() => { setStep(1); clearError() }} className="text-[var(--color-primary)] underline underline-offset-2">修改</button>
            </div>
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
            <button type="submit" disabled={loading} className="ui-btn ui-btn-primary w-full py-3 disabled:opacity-50">
              {loading ? t("auth.creatingAccount") || "Creating account..." : t("auth.register")}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          {t("auth.haveAccount")} <Link to="/login" className="text-[var(--color-primary)] font-medium">{t("auth.login")}</Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
