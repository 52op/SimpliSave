import { useMemo, useState } from "react"

const failedHosts = new Map<string, number>()
const FAIL_TTL = 5 * 60 * 1000

const PALETTE = [
  "#e74c3c", "#e67e22", "#d97706", "#16a34a", "#0891b2",
  "#2563eb", "#4f46e5", "#7c3aed", "#db2777", "#6b7280",
]

function hashTitle(title: string): number {
  let h = 0
  for (let i = 0; i < title.length; i++) {
    h = ((h << 5) - h + title.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function getColorFromTitle(title: string) {
  return PALETTE[hashTitle(title) % PALETTE.length]
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getHostname(src?: string | null) {
  if (!src) return ""
  try {
    return new URL(src).hostname
  } catch {
    return ""
  }
}

function isHostBlocked(hostname: string) {
  if (!hostname) return false
  const last = failedHosts.get(hostname)
  if (!last) return false
  if (Date.now() - last > FAIL_TTL) {
    failedHosts.delete(hostname)
    return false
  }
  return true
}

export default function Favicon({ src, title, size = "md" }: { src?: string | null; title: string; size?: "sm" | "md" | "lg" | "xl" | "category" }) {
  const hostname = useMemo(() => getHostname(src), [src])
  const [errored, setErrored] = useState(() => isHostBlocked(hostname))

  const sizeClass = {
    sm: "w-6 h-6 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-xl",
    category: "w-14 h-14 text-lg",
  }[size]

  if (!src || errored) {
    const color = getColorFromTitle(title)
    return (
      <div
        className={`${sizeClass} shrink-0 rounded-xl flex items-center justify-center font-bold`}
        style={{ backgroundColor: hexToRgba(color, 0.12), color }}
      >
        {title?.trim()?.[0]?.toUpperCase() || "S"}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      className={`${sizeClass} shrink-0 rounded-xl object-cover border border-[var(--color-border)] bg-[var(--color-surface)]`}
      onError={() => {
        if (hostname) failedHosts.set(hostname, Date.now())
        setErrored(true)
      }}
    />
  )
}
}

function isHostBlocked(hostname: string) {
  if (!hostname) return false
  const last = failedHosts.get(hostname)
  if (!last) return false
  if (Date.now() - last > FAIL_TTL) {
    failedHosts.delete(hostname)
    return false
  }
  return true
}

export default function Favicon({ src, title, size = "md" }: { src?: string | null; title: string; size?: "sm" | "md" | "lg" | "xl" | "category" }) {
  const hostname = useMemo(() => getHostname(src), [src])
  const [errored, setErrored] = useState(() => isHostBlocked(hostname))

  const sizeClass = {
    sm: "w-6 h-6 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-xl",
    category: "w-12 h-12 text-sm",
  }[size]

  if (!src || errored) {
    return <div className={`${sizeClass} shrink-0 rounded-xl bg-[var(--color-primary-weak)] text-[var(--color-primary)] flex items-center justify-center font-semibold`}>{title?.trim()?.[0]?.toUpperCase() || "S"}</div>
  }

  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      className={`${sizeClass} shrink-0 rounded-xl object-cover border border-[var(--color-border)] bg-[var(--color-surface)]`}
      onError={() => {
        if (hostname) failedHosts.set(hostname, Date.now())
        setErrored(true)
      }}
    />
  )
}
