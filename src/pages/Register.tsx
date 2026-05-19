import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { Link, useNavigate } from "react-router-dom"

const RegisterPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const register = useAuthStore((state) => state.register)
  const error = useAuthStore((state) => state.error)
  const loading = useAuthStore((state) => state.loading)
  const clearError = useAuthStore((state) => state.clearError)
  const setError = useAuthStore((state) => state.setError)
  const errorRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" })

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  useEffect(() => () => clearError(), [clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setError(t("auth.passwordMismatch") || "Passwords do not match")
      return
    }
    try {
      await register(formData.name, formData.email, formData.password)
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div ref={errorRef} tabIndex={-1} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">{t("auth.name")}</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} className="ui-input px-4 py-3" placeholder={t("auth.name")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">{t("auth.email")}</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="ui-input px-4 py-3" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">{t("auth.password")}</label>
            <input type="password" name="password" required value={formData.password} onChange={handleChange} className="ui-input px-4 py-3" placeholder="请输入密码" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-main)] mb-2">{t("auth.confirmPassword")}</label>
            <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} className="ui-input px-4 py-3" placeholder="请再次输入密码" />
          </div>
          <button type="submit" disabled={loading} className="ui-btn ui-btn-primary w-full py-3 disabled:opacity-50">
            {loading ? t("auth.creatingAccount") || "Creating account..." : t("auth.register")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          {t("auth.haveAccount")} <Link to="/login" className="text-[var(--color-primary)] font-medium">{t("auth.login")}</Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
