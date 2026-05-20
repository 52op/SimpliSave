import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { ExternalLink, Copy, Edit2, Trash2, Move, Star, Archive } from "lucide-react"

interface Props {
  x: number
  y: number
  isFavorite: boolean
  isArchived: boolean
  onClose: () => void
  onOpenInNewTab: () => void
  onCopyUrl: () => void
  onEdit: () => void
  onDelete: () => void
  onMove: () => void
  onToggleFavorite: () => void
  onToggleArchive: () => void
}

export default function BookmarkContextMenu({
  x, y, isFavorite, isArchived, onClose,
  onOpenInNewTab, onCopyUrl, onEdit, onDelete, onMove, onToggleFavorite, onToggleArchive,
}: Props) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const menuX = Math.min(x, window.innerWidth - 200)
  const menuY = Math.min(y, window.innerHeight - 320)

  const items = [
    { icon: ExternalLink, label: t("bookmarks.openInNewTab"), onClick: onOpenInNewTab },
    { icon: Copy, label: t("bookmarks.copyUrl"), onClick: onCopyUrl },
    { divider: true },
    { icon: Edit2, label: t("bookmarks.edit"), onClick: onEdit },
    { icon: Move, label: t("bookmarks.batchMoveTo"), onClick: onMove },
    { icon: Star, label: isFavorite ? t("bookmarks.unfavorite") : t("bookmarks.favorite"), onClick: onToggleFavorite },
    { icon: Archive, label: isArchived ? t("bookmarks.unarchive") : t("bookmarks.archived"), onClick: onToggleArchive },
    { divider: true },
    { icon: Trash2, label: t("bookmarks.delete"), onClick: onDelete, danger: true },
  ]

  return (
    <div ref={ref} className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px]"
      style={{ left: menuX, top: menuY }}>
      {(items as any[]).map((item, i) =>
        item.divider ? (
          <div key={i} className="border-t border-gray-200 dark:border-gray-700 my-1" />
        ) : (
          <button key={i} onClick={() => { item.onClick(); onClose() }}
            className={`flex items-center gap-3 w-full px-3 py-2 text-sm text-left
              ${item.danger ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </button>
        )
      )}
    </div>
  )
}
