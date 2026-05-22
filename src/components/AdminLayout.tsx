import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Star, Send, Globe, Search, Image, Settings, Mail } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const loc = useLocation()

  const navs = [
    { p: "/admin/categories", l: t("categories.title"), icon: Star },
    { p: "/admin/submissions", l: t("admin.submissions.title"), icon: Send },
    { p: "/admin/bookmarks", l: t("admin.bookmarks.title"), icon: Globe },
    { p: "/admin/search-engines", l: t("admin.searchEngines.title"), icon: Search },
    { p: "/admin/imagebeds", l: t("admin.imagebeds.title"), icon: Image },
    { p: "/admin/site-settings", l: t("admin.siteSettings.title"), icon: Settings },
    { p: "/admin/email-config", l: "邮件配置", icon: Mail },
  ]

  return (
    <div className="flex gap-6 items-start">
      <aside className="hidden md:block w-44 shrink-0 sticky top-20">
        <div className="ui-card p-2">
          <nav className="space-y-0.5">
            {navs.map(({ p, l, icon: Icon }) => {
              const active = loc.pathname === p
              return (
                <Link
                  key={p}
                  to={p}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--color-primary-weak)] text-[var(--color-primary)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-main)]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {l}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
