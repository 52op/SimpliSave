import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "./stores/authStore"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"
import { siteSettingsApi } from "./services/api"
import type { SiteSettings } from "./types"
import Home from "./pages/Home"
import Bookmarks from "./pages/Bookmarks"
import Memos from "./pages/Memos"
import Login from "./pages/Login"
import Register from "./pages/Register"
import AdminCategories from "./pages/admin/AdminCategories"
import AdminSubmissions from "./pages/admin/AdminSubmissions"
import AdminBookmarks from "./pages/admin/AdminBookmarks"
import AdminSearchEngines from "./pages/admin/AdminSearchEngines"
import AdminImageBeds from "./pages/admin/AdminImageBeds"
import AdminSiteSettings from "./pages/admin/AdminSiteSettings"
import CardGroupDetail from "./pages/CardGroupDetail"
import SearchPage from "./pages/Search"
import Profile from "./pages/Profile"
import Header from "./components/Header"
import "./index.css"

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

export default function App() {
  const { t, i18n } = useTranslation()
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)

  useEffect(() => {
    siteSettingsApi.get().then(setSiteSettings).catch(() => {})
  }, [])

  useEffect(() => {
    if (!siteSettings) return
    document.title = siteSettings.site_name || "SimpliSave"

    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    if (siteSettings.favicon_url) {
      link.href = siteSettings.favicon_url
    }

    let metaDesc = document.querySelector<HTMLMetaElement>("meta[name='description']")
    if (!metaDesc) {
      metaDesc = document.createElement("meta")
      metaDesc.name = "description"
      document.head.appendChild(metaDesc)
    }
    metaDesc.content = siteSettings.description || ""

    let metaKeywords = document.querySelector<HTMLMetaElement>("meta[name='keywords']")
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta")
      metaKeywords.name = "keywords"
      document.head.appendChild(metaKeywords)
    }
    metaKeywords.content = siteSettings.keywords || ""

    // GA
    const existingGa = document.querySelector("script[src*='googletagmanager']")
    if (siteSettings.ga_id && !existingGa) {
      const s = document.createElement("script")
      s.async = true
      s.src = `https://www.googletagmanager.com/gtag/js?id=${siteSettings.ga_id}`
      document.head.appendChild(s)
      const inline = document.createElement("script")
      inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${siteSettings.ga_id}');`
      document.head.appendChild(inline)
    }

    // custom head HTML
    if (siteSettings.custom_head_html) {
      const container = document.getElementById("custom-head")
      if (!container) {
        const div = document.createElement("div")
        div.id = "custom-head"
        div.style.display = "none"
        document.head.appendChild(div)
      }
      const el = document.getElementById("custom-head")
      if (el) el.innerHTML = siteSettings.custom_head_html
    }
  }, [siteSettings])

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
            <Route path="/memos" element={<ProtectedRoute><Memos /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/g/:slug" element={<CardGroupDetail />} />
            <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
            <Route path="/admin/submissions" element={<AdminRoute><AdminSubmissions /></AdminRoute>} />
            <Route path="/admin/bookmarks" element={<AdminRoute><AdminBookmarks /></AdminRoute>} />
            <Route path="/admin/search-engines" element={<AdminRoute><AdminSearchEngines /></AdminRoute>} />
            <Route path="/admin/imagebeds" element={<AdminRoute><AdminImageBeds /></AdminRoute>} />
            <Route path="/admin/site-settings" element={<AdminRoute><AdminSiteSettings /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="bg-gray-100 py-4 mt-8">
          <div className="container mx-auto text-center text-gray-500 text-sm">
            {siteSettings?.footer_html ? (
              <span dangerouslySetInnerHTML={{ __html: siteSettings.footer_html }} />
            ) : (
              <span>&copy; {new Date().getFullYear()} SimpliSave &mdash; {t("app.description")}</span>
            )}
            {siteSettings?.beian && (
              <span className="ml-2">
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">{siteSettings.beian}</a>
              </span>
            )}
          </div>
        </footer>
      </div>
    </Router>
  )
}
