import type { ReactNode } from "react"

export default function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ui-card p-4 ${className}`.trim()}>{children}</div>
}
