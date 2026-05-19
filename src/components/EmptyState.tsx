import type { ReactNode } from "react"

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  tone?: "default" | "error"
}

export default function EmptyState({ title, description, icon, action, tone = "default" }: EmptyStateProps) {
  return (
    <div className={`ui-card text-center py-12 ${tone === "error" ? "border-red-200/70 dark:border-red-800/60" : ""}`}>
      {icon ? <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-[var(--color-text-main)]">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
