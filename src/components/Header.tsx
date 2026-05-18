import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "../stores/authStore"
import { useThemeStore } from "../stores/themeStore"
import { useTranslation } from "react-i18next"
import { Sun, Moon, LogOut, Menu, X, Home, Star, BookOpen, User, Shield, Send, Globe, Search, Image, Settings } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import SearchModal from "./SearchModal"

export default function Header() {
  const { token, logout, user } = useAuthStore()
  const { dark, toggle: toggleDark } = useThemeStore()
  const { t, i18n } = useTranslation()
  const loc = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const adminTimer = useRef<number>()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true) }
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault(); setSearchOpen(true)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

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
    { p: "/admin/site-settings", l: "站点设置", icon: <Settings className="w-4 h-4" /> },
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
    <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label={sidebarOpen ? "关闭菜单" : "打开菜单"}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X className="w-5 h-5 dark:text-gray-300" /> : <Menu className="w-5 h-5 dark:text-gray-300" />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">SimpliSave</span>
            </Link>
            <nav className="hidden md:flex gap-1">
              {navs.map((n) => (
                <Link
                  key={n.p}
                  to={n.p}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${
                    loc.pathname === n.p
                      ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {n.icon}
                  {n.l}
                </Link>
              ))}
              {isAdmin && (
                <div className="relative" onMouseEnter={openAdminMenu} onMouseLeave={closeAdminMenu}>
                  <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    管理
                  </button>
                  {adminDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]" onMouseEnter={openAdminMenu} onMouseLeave={closeAdminMenu}>
                      {adminNavs.map((n) => (
                        <Link key={n.p} to={n.p}
                          onClick={() => setAdminDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center gap-1.5"
              title={t("search.title") || "搜索 (Ctrl+K)"}
              aria-label="搜索"
            >
              <Search className="w-4 h-4" />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-500 dark:text-gray-400">Ctrl+K</kbd>
            </button>
            {searchOpen && <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />}
            <button
              onClick={toggleDark}
              className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              title={dark ? "切换亮色模式" : "切换深色模式"}
              aria-label={dark ? "切换亮色模式" : "切换深色模式"}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleLang}
              className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center gap-1"
              title="切换语言"
            >
              <span className="text-sm font-medium">{i18n.language === "zh" ? "EN" : "中"}</span>
            </button>
            {token ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{user?.name || user?.email}</span>
                  {isAdmin && <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded">Admin</span>}
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
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
      <div className={`lg:hidden border-t dark:border-gray-700 overflow-hidden transition-all duration-300 ease ${sidebarOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-4 py-3 space-y-1 bg-white dark:bg-gray-900">
              {navs.map((n) => (
            <Link
              key={n.p}
              to={n.p}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2 px-3 py-3 rounded-md text-sm ${
                loc.pathname === n.p
                  ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
              className="flex items-center gap-2 px-3 py-3 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <User className="w-4 h-4" />
              个人资料
            </Link>
          )}
          {isAdmin && (
            <>
              <div className="border-t dark:border-gray-700 my-2" />
              <p className="px-3 text-xs text-gray-400 font-medium">管理</p>
              {adminNavs.map((n) => (
                <Link
                  key={n.p}
                  to={n.p}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-3 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {n.icon}
                  {n.l}
                </Link>
              ))}
            </>
          )}
          {!token && (
            <>
              <div className="border-t dark:border-gray-700 my-2" />
              <Link
                to="/login"
                onClick={() => setSidebarOpen(false)}
                className="block px-3 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
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
      </div>
    </header>
  )
}
