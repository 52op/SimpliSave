import { useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Star, Edit2, Trash2, Archive, Share2, Loader2, ExternalLink, GripVertical, CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown, Move } from "lucide-react"
import Favicon from "./Favicon"
import type { Bookmark } from "../types"
import BookmarkContextMenu from "./BookmarkContextMenu"

type SortField = 'title' | 'url' | 'created_at' | 'updated_at'
type SortDir = 'asc' | 'desc'

interface Props {
  bookmarks: Bookmark[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onOpenEdit: (b: Bookmark) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string, current: number) => void
  onToggleArchive: (id: string, current: number) => void
  onShare: (b: Bookmark) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onMoveToCategory: () => void
  submittingShare: string | null
}

function formatDate(d: string, t: (key: string, opts?: any) => string): string {
  if (!d) return ''
  const date = new Date(d)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return t("bookmarks.today")
  if (days === 1) return t("bookmarks.yesterday")
  if (days < 7) return t("bookmarks.daysAgo", { days })
  if (days < 30) return t("bookmarks.weeksAgo", { weeks: Math.floor(days / 7) })
  if (days < 365) return t("bookmarks.monthsAgo", { months: Math.floor(days / 30) })
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function BookmarkListView({
  bookmarks, selectedIds, onToggleSelect, onToggleSelectAll,
  onOpenEdit, onDelete, onToggleFavorite, onToggleArchive, onShare,
  onDragStart, onMoveToCategory, submittingShare,
}: Props) {
  const { t } = useTranslation()
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; bookmark: Bookmark } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const sorted = useMemo(() => {
    return [...bookmarks].sort((a, b) => {
      let cmp = 0
      if (sortField === 'title') cmp = a.title.localeCompare(b.title)
      else if (sortField === 'url') cmp = a.url.localeCompare(b.url)
      else if (sortField === 'created_at') cmp = a.created_at.localeCompare(b.created_at)
      else if (sortField === 'updated_at') cmp = a.updated_at.localeCompare(b.updated_at)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [bookmarks, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
    return sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
  }

  function handleContextMenu(e: React.MouseEvent, b: Bookmark) {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, bookmark: b })
  }

  function handleTitleSubmit(id: string) {
    if (editTitle.trim()) {
      onOpenEdit({ ...bookmarks.find(b => b.id === id)!, title: editTitle.trim() } as Bookmark)
    }
    setEditingId(null)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
            <th className="w-10 px-2 py-2 text-left">
              <button onClick={onToggleSelectAll}>
                {selectedIds.size === bookmarks.length && bookmarks.length > 0
                  ? <CheckSquare className="w-4 h-4 text-blue-500" />
                  : <Square className="w-4 h-4" />}
              </button>
            </th>
            <th className="w-6 px-1 py-2" />
            <th className="px-2 py-2 text-left cursor-pointer select-none" onClick={() => toggleSort('title')}>
              <div className="flex items-center gap-1"><SortIcon field="title" />{t("bookmarks.columnTitle")}</div>
            </th>
            <th className="px-2 py-2 text-left hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort('url')}>
              <div className="flex items-center gap-1"><SortIcon field="url" />{t("bookmarks.columnUrl")}</div>
            </th>
            <th className="px-2 py-2 text-left hidden sm:table-cell cursor-pointer select-none w-24" onClick={() => toggleSort('created_at')}>
              <div className="flex items-center gap-1"><SortIcon field="created_at" />{t("bookmarks.columnCreatedAt")}</div>
            </th>
            <th className="w-24 px-2 py-2 text-right">{t("bookmarks.columnActions")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b, idx) => {
            const tagsArray = typeof b.tags === 'string' ? JSON.parse(b.tags || '[]') : b.tags
            const isSelected = selectedIds.has(b.id)

            return (
              <tr key={b.id}
                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 group
                  ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                draggable
                onDragStart={e => onDragStart(e, b.id)}
                onContextMenu={e => handleContextMenu(e, b)}
              >
                <td className="px-2 py-2.5">
                  <button onClick={() => onToggleSelect(b.id)} className="text-gray-400 hover:text-blue-500">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4" />}
                  </button>
                </td>
                <td className="px-1 py-2.5 text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4" />
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2">
                    <Favicon src={b.icon_url} title={b.title} size="sm" />
                    {editingId === b.id ? (
                      <input type="text" value={editTitle} autoFocus
                        className="flex-1 min-w-0 px-1.5 py-0.5 border border-blue-400 rounded text-sm bg-white dark:bg-gray-800 outline-none"
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => handleTitleSubmit(b.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleTitleSubmit(b.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }} />
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <a href={b.url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[200px] lg:max-w-[300px]"
                          onClick={e => e.stopPropagation()}>
                          {b.title}
                        </a>
                        <button onClick={() => { setEditingId(b.id); setEditTitle(b.title) }}
                          className="p-0.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 shrink-0">
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2.5 hidden md:table-cell">
                  <span className="text-gray-400 dark:text-gray-500 truncate max-w-[250px] inline-block align-bottom">{b.url}</span>
                </td>
                <td className="px-2 py-2.5 hidden sm:table-cell whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">
                  {formatDate(b.created_at, t)}
                </td>
                <td className="px-2 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <button onClick={() => onToggleFavorite(b.id, b.is_favorite)}
                      className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${b.is_favorite ? 'text-yellow-500' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}>
                      <Star className="w-4 h-4" fill={b.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => onOpenEdit(b)}
                      className="p-1 rounded text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onShare(b)} disabled={submittingShare === b.id}
                      className="p-1 rounded text-gray-400 hover:text-green-600 opacity-0 group-hover:opacity-100 disabled:opacity-50">
                      {submittingShare === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    </button>
                    <button onClick={() => onToggleArchive(b.id, b.archived)}
                      className="p-1 rounded text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100">
                      <Archive className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(b.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {sorted.length === 0 && (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">{t("bookmarks.empty")}</div>
      )}

      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
          <span className="text-sm text-gray-500">{t("bookmarks.selectedCount", { count: selectedIds.size })}</span>
          <button onClick={onMoveToCategory} className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5" />{t("bookmarks.batchMoveTo")}
          </button>
          <button onClick={() => {
            selectedIds.forEach(id => {
              const b = bookmarks.find(x => x.id === id)
              if (b) onToggleFavorite(id, b.is_favorite)
            })
          }} className="px-3 py-1.5 text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/50">{t("bookmarks.favorite")}</button>
          <button onClick={() => {
            selectedIds.forEach(id => {
              const b = bookmarks.find(x => x.id === id)
              if (b) onToggleArchive(id, b.archived)
            })
          }} className="px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50">{t("bookmarks.archived")}</button>
          <button onClick={() => {
            selectedIds.forEach(id => onDelete(id))
          }} className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50">{t("bookmarks.delete")}</button>
        </div>
      )}

      {contextMenu && (
        <BookmarkContextMenu
          x={contextMenu.x} y={contextMenu.y}
          isFavorite={contextMenu.bookmark.is_favorite === 1}
          isArchived={contextMenu.bookmark.archived === 1}
          onClose={() => setContextMenu(null)}
          onOpenInNewTab={() => window.open(contextMenu.bookmark.url, '_blank')}
          onCopyUrl={() => navigator.clipboard.writeText(contextMenu.bookmark.url)}
          onEdit={() => { onOpenEdit(contextMenu.bookmark); setContextMenu(null) }}
          onDelete={() => { onDelete(contextMenu.bookmark.id); setContextMenu(null) }}
          onMove={() => { onMoveToCategory(); setContextMenu(null) }}
          onToggleFavorite={() => { onToggleFavorite(contextMenu.bookmark.id, contextMenu.bookmark.is_favorite); setContextMenu(null) }}
          onToggleArchive={() => { onToggleArchive(contextMenu.bookmark.id, contextMenu.bookmark.archived); setContextMenu(null) }}
        />
      )}
    </div>
  )
}
