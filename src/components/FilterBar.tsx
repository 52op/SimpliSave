import type { ReactNode } from "react"

export default function FilterBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col lg:flex-row gap-4 ${className}`.trim()}>{children}</div>
}
