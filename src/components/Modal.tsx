import { useRef, useEffect } from "react"
import { X } from "lucide-react"

export default function Modal({
  show,
  title,
  children,
  onClose,
  widthClass = "max-w-lg",
  fullScreen = false,
}: {
  show: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  widthClass?: string
  fullScreen?: boolean
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show) return
    const prev = document.activeElement as HTMLElement
    contentRef.current?.focus()
    return () => prev?.focus()
  }, [show])

  useEffect(() => {
    if (!show) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return }
      if (e.key !== "Tab" || !contentRef.current) return
      const focusable = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [show, onClose])

  if (!show) return null
  if (fullScreen) {
    return (
      <div ref={overlayRef} className="fixed inset-0 bg-[var(--color-surface)] z-50 flex flex-col" onClick={onClose}
        role="dialog" aria-modal="true" aria-label={title}>
        <div ref={contentRef} tabIndex={-1} className="flex flex-col h-full outline-none"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--color-border)] flex-shrink-0">
            <h3 className="text-lg font-semibold text-[var(--color-text-main)]">{title}</h3>
            <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]" aria-label="关闭"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      </div>
    )
  }
  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}
      role="dialog" aria-modal="true" aria-label={title}>
      <div ref={contentRef} tabIndex={-1} className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl ${widthClass} w-full max-h-[90vh] overflow-y-auto outline-none shadow-2xl`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-main)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]" aria-label="关闭"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
