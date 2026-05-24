import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./stores/authStore"
import { useTranslation } from "react-i18next"
import { useEffect, Suspense, lazy } from "react"
import { Helmet } from "react-helmet-async"
import Header from "./components/Header"
import AdminLayout from "./components/AdminLayout"
import { useThemeStore } from "./stores/themeStore"
import { useSiteSettingsStore } from "./stores/siteSettingsStore"
import "./index.css"

const Home = lazy(() => import("./pages/Home"))
const Bookmarks = lazy(() => import("./pages/Bookmarks"))
const Memos = lazy(() => import("./pages/Memos"))
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"))
const AdminSubmissions = lazy(() => import("./pages/admin/AdminSubmissions"))
const AdminBookmarks = lazy(() => import("./pages/admin/AdminBookmarks"))
const AdminSearchEngines = lazy(() => import("./pages/admin/AdminSearchEngines"))
const AdminImageBeds = lazy(() => import("./pages/admin/AdminImageBeds"))
const AdminSiteSettings = lazy(() => import("./pages/admin/AdminSiteSettings"))
const AdminEmailConfig = lazy(() => import("./pages/admin/AdminEmailConfig"))
const CardGroupDetail = lazy(() => import("./pages/CardGroupDetail"))
const SearchPage = lazy(() => import("./pages/Search"))
const Profile = lazy(() => import("./pages/Profile"))
const MemoViewer = lazy(() => import("./pages/MemoViewer"))
const UserPublicPage = lazy(() => import("./pages/UserPublicPage"))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== "admin") return <Navigate to="/" replace />
  return <>{children}</>
}

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}

export default function App() {
  const { t, i18n } = useTranslation()
  const initTheme = useThemeStore((s) => s.initTheme)
  const validateSession = useAuthStore((s) => s.validateSession)
  const siteSettings = useSiteSettingsStore((s) => s.settings)
  const loadSiteSettings = useSiteSettingsStore((s) => s.load)

  const loginWithSSOToken = useAuthStore((s) => s.loginWithSSOToken)

  useEffect(() => {
    const bootstrap = async () => {
      const isSSOMode = import.meta.env.VITE_AUTH_MODE === 'sso'
      const ssoUrl = import.meta.env.VITE_SSO_URL as string | undefined

      // SSO 回调：GoAuth 登录后以 ?token=<JWT> 跳转回来
      const params = new URLSearchParams(window.location.search)
      const ssoToken = params.get('token')
      if (ssoToken) {
        params.delete('token')
        const newSearch = params.toString()
        window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''))
        await loginWithSSOToken(ssoToken).catch(() => {})
        return
      }

      const localToken = useAuthStore.getState().token

      // SSO 模式：每次都检查 GoAuth 会话（保证退出/切换账号能同步）
      if (isSSOMode && ssoUrl) {
        try {
          const res = await fetch(`${ssoUrl}/api/auth/me`, { credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            const goauthToken = data.data?.token
            if (goauthToken) {
              if (goauthToken !== localToken) {
                // GoAuth 用户变了（切换账号/首次检测）→ 更新本地 token
                await loginWithSSOToken(goauthToken).catch(() => {})
              } else {
                // 同一用户 → 正常验证
                await validateSession().catch(() => {})
              }
              return
            }
          }
          // GoAuth 未登录 → 清除本地 token
          if (localToken) useAuthStore.getState().logout()
        } catch {
          // GoAuth 不可达，保留本地 token（不强制退出）
          if (localToken) await validateSession().catch(() => {})
        }
        return
      }

      // standalone 模式：只验证本地 token
      if (localToken) {
        await validateSession().catch(() => {})
      }
    }

    bootstrap()
    initTheme()
    loadSiteSettings()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // GA
  useEffect(() => {
    if (!siteSettings?.ga_id) return
    const existingGa = document.querySelector("script[src*='googletagmanager']")
    if (existingGa) return
    const s = document.createElement("script")
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${siteSettings.ga_id}`
    document.head.appendChild(s)
    const inline = document.createElement("script")
    inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${siteSettings.ga_id}');`
    document.head.appendChild(inline)
  }, [siteSettings])

  // Custom head HTML
  useEffect(() => {
    if (!siteSettings?.custom_head_html) return
    let container = document.getElementById("custom-head")
    if (!container) {
      container = document.createElement("div")
      container.id = "custom-head"
      container.style.display = "none"
      document.head.appendChild(container)
    }
    container.innerHTML = siteSettings.custom_head_html
  }, [siteSettings])

  const siteName = siteSettings?.site_name || "SimpliSave"
  const siteDesc = siteSettings?.description || ""

  return (
    <Router>
      <Helmet>
        <title>{siteName}</title>
        <meta name="description" content={siteDesc} />
        <meta name="keywords" content={siteSettings?.keywords || ""} />
        {siteSettings?.favicon_url && <link rel="icon" href={siteSettings.favicon_url} />}
        <meta property="og:title" content={siteName} />
        <meta property="og:description" content={siteDesc} />
        <meta name="twitter:card" content="summary" />
        <html lang={i18n.language === "en" ? "en" : "zh"} />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto p-4">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
              <Route path="/memos" element={<ProtectedRoute><Memos /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/g/:slug" element={<CardGroupDetail />} />
              <Route path="/admin/categories" element={<AdminRoute><AdminLayout><AdminCategories /></AdminLayout></AdminRoute>} />
              <Route path="/admin/submissions" element={<AdminRoute><AdminLayout><AdminSubmissions /></AdminLayout></AdminRoute>} />
              <Route path="/admin/bookmarks" element={<AdminRoute><AdminLayout><AdminBookmarks /></AdminLayout></AdminRoute>} />
              <Route path="/admin/search-engines" element={<AdminRoute><AdminLayout><AdminSearchEngines /></AdminLayout></AdminRoute>} />
              <Route path="/admin/imagebeds" element={<AdminRoute><AdminLayout><AdminImageBeds /></AdminLayout></AdminRoute>} />
              <Route path="/admin/site-settings" element={<AdminRoute><AdminLayout><AdminSiteSettings /></AdminLayout></AdminRoute>} />
              <Route path="/admin/email-config" element={<AdminRoute><AdminLayout><AdminEmailConfig /></AdminLayout></AdminRoute>} />
              <Route path="/memo/:id" element={<MemoViewer />} />
              <Route path="/u/:id" element={<UserPublicPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="bg-gray-100 dark:bg-gray-800 py-4 mt-8">
          <div className="container mx-auto text-center text-gray-500 dark:text-gray-400 text-sm">
            {siteSettings?.footer_html ? (
              <span dangerouslySetInnerHTML={{ __html: siteSettings.footer_html }} />
            ) : (
              <span>&copy; {new Date().getFullYear()} SimpliSave &mdash; {t("app.description")}</span>
            )}
            {siteSettings?.beian && (
              <span className="ml-2">
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 dark:hover:text-gray-300">{siteSettings.beian}</a>
              </span>
            )}
          </div>
        </footer>
      </div>
    </Router>
  )
}
