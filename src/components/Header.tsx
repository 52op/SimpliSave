import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "../stores/authStore"
import { useTranslation } from "react-i18next"
import { Sun, Moon, LogOut, Menu, X, Home, Star, BookOpen, User, Shield, Send, Globe, Search, Image } from "lucide-react"
import { useState, useRef } from "react"

export default function Header() {
  const { token, logout, user } = useAuthStore()
  const { t, i18n } = useTranslation()
  const loc = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
  const adminTimer = useRef<number>()

  const toggleLang = () => {
    const next = i18n.language === "zh" ? "en" : "zh"
    i18n.changeLanguage(next)
  }

  const isAdmin = user?.role === "admin"

  const navs = [
    { p: "/", l: t("nav.home"), icon: <Home className="w-4 h-4" /> },
    { p: "/bookmarks", l: t("nav.bookmarks"), icon: <Star className="w-4 h-4" /> },
    { p: "/memos", l: t("nav.memos"), icon: <BookOpen className="w-4 h-4" /> },
  ]

  const adminNavs = [
    { p: "/admin/categories", l: t("categories.title"), icon: <Star className="w-4 h-4" /> },
    { p: "/admin/submissions", l: "审核链接", icon: <Send className="w-4 h-4" /> },
    { p: "/admin/bookmarks", l: t("admin.bookmarks.title"), icon: <Globe className="w-4 h-4" /> },
    { p: "/admin/search-engines", l: "搜索引擎", icon: <Search className="w-4 h-4" /> },
    { p: "/admin/imagebeds", l: "图床管理", icon: <Image className="w-4 h-4" /> },
  ]

  function openAdminMenu() {
    if (adminTimer.current) clearTimeout(adminTimer.current)
    setAdminDropdownOpen(true)
  }

  function closeAdminMenu() {
    if (adminTimer.current) clearTimeout(adminTimer.current)
    adminTimer.current = window.setTimeout(() => setAdminDropdownOpen(false), 200)
  }

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">SimpliSave</span>
            </Link>
            <nav className="hidden md:flex gap-1">
              {navs.map((n) => (
                <Link
                  key={n.p}
                  to={n.p}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${
                    loc.pathname === n.p
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {n.icon}
                  {n.l}
                </Link>
              ))}
              {isAdmin && (
                <div className="relative" onMouseEnter={openAdminMenu} onMouseLeave={closeAdminMenu}>
                  <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    管理
                  </button>
                  {adminDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[140px]" onMouseEnter={openAdminMenu} onMouseLeave={closeAdminMenu}>
                      {adminNavs.map((n) => (
                        <Link key={n.p} to={n.p}
                          onClick={() => setAdminDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                          {n.icon}
                          {n.l}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 text-sm flex items-center gap-1"
              title="切换语言"
            >
              {i18n.language === "zh" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline">{i18n.language === "zh" ? "中文" : "English"}</span>
            </button>
            {token ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md hover:bg-gray-100"
                >
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-700">{user?.name || user?.email}</span>
                  {isAdmin && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Admin</span>}
                </Link>
                <button
                  onClick={() => {
                    logout()
                    navigate("/")
                  }}
                  className="px-3 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("auth.logout")}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                >
                  {t("auth.login")}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition"
                >
                  {t("auth.register")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar for mobile */}
      {sidebarOpen && (
        <div className="lg:hidden border-t px-4 py-3 space-y-1 bg-white">
              {navs.map((n) => (
            <Link
              key={n.p}
              to={n.p}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2 px-3 py-3 rounded-md text-sm ${
                loc.pathname === n.p
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {n.icon}
              {n.l}
            </Link>
          ))}
          {token && (
            <Link
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 px-3 py-3 rounded-md text-sm text-gray-600 hover:bg-gray-100"
            >
              <User className="w-4 h-4" />
              个人资料
            </Link>
          )}
          {isAdmin && (
            <>
              <div className="border-t my-2" />
              <p className="px-3 text-xs text-gray-400 font-medium">管理</p>
              {adminNavs.map((n) => (
                <Link
                  key={n.p}
                  to={n.p}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-3 rounded-md text-sm text-gray-600 hover:bg-gray-100"
                >
                  {n.icon}
                  {n.l}
                </Link>
              ))}
            </>
          )}
          {!token && (
            <>
              <div className="border-t my-2" />
              <Link
                to="/login"
                onClick={() => setSidebarOpen(false)}
                className="block px-3 py-3 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                {t("auth.login")}
              </Link>
              <Link
                to="/register"
                onClick={() => setSidebarOpen(false)}
                className="block px-3 py-3 text-sm bg-blue-600 text-white rounded-md text-center font-medium"
              >
                {t("auth.register")}
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
