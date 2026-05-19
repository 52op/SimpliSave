import type { ReactNode } from "react"

export default function FilterBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col flex-wrap gap-4 lg:flex-row ${className}`.trim()}>{children}</div>
}
