import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import type { Category, Bookmark } from "../types"

interface Props {
  categories: Category[]
  bookmarks: Bookmark[]
  selectedCategoryId: string | null
  onSelectCategory: (id: string | null) => void
  onDropBookmark: (bookmarkId: string, targetCategoryId: string | null) => void
  onAddSubCategory: (parentId: string) => void
  onRenameCategory: (id: string, name: string) => void
  onDeleteCategory: (id: string) => void
}

function getDescendantCount(catId: string, bookmarks: Bookmark[], categories: Category[]): number {
  const cats = categories.filter(c => c.parent_id === catId)
  let count = bookmarks.filter(b => b.category_id === catId).length
  for (const c of cats) {
    count += getDescendantCount(c.id, bookmarks, categories)
  }
  return count
}

interface TreeNode extends Category {
  children: TreeNode[]
}

function TreeNode({
  category,
  categories,
  bookmarks,
  depth,
  selectedCategoryId,
  onSelect,
  onDrop,
  onAddSub,
  onRename,
  onDelete,
}: {
  category: TreeNode
  categories: Category[]
  bookmarks: Bookmark[]
  depth: number
  selectedCategoryId: string | null
  onSelect: (id: string | null) => void
  onDrop: (bookmarkId: string, targetCategoryId: string | null) => void
  onAddSub: (parentId: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(category.name)

  const count = getDescendantCount(category.id, bookmarks, categories)
  const isSelected = selectedCategoryId === category.id
  const hasChildren = category.children.length > 0

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const id = e.dataTransfer.getData('text/plain')
    if (id) onDrop(id, category.id)
  }, [category.id, onDrop])

  function handleRenameSubmit() {
    if (editName.trim() && editName !== category.name) {
      onRename(category.id, editName.trim())
    }
    setEditing(false)
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm group
          ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}
          ${dragOver ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => onSelect(isSelected ? null : category.id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {hasChildren ? (
          <button onClick={e => { e.stopPropagation(); setExpanded(v => !v) }} className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {isSelected ? <FolderOpen className="w-4 h-4 shrink-0 text-blue-500" /> : <Folder className="w-4 h-4 shrink-0 text-gray-400" />}
        {editing ? (
          <input type="text" value={editName} autoFocus
            className="flex-1 min-w-0 px-1 py-0 border border-blue-400 rounded bg-white dark:bg-gray-800 text-sm outline-none"
            onClick={e => e.stopPropagation()}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setEditing(false) }} />
        ) : (
          <span className="flex-1 min-w-0 truncate">{category.name}</span>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{count > 0 ? count : ''}</span>
        <div className="relative shrink-0">
          <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }} className="p-0.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]" onClick={e => e.stopPropagation()}>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left" onClick={() => { onAddSub(category.id); setShowMenu(false) }}>
                <Plus className="w-3.5 h-3.5" />{t("bookmarks.addSubcategory")}
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left" onClick={() => { setEditName(category.name); setEditing(true); setShowMenu(false) }}>
                <Pencil className="w-3.5 h-3.5" />{t("bookmarks.rename")}
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left" onClick={() => { onDelete(category.id); setShowMenu(false) }}>
                <Trash2 className="w-3.5 h-3.5" />{t("common.delete")}
              </button>
            </div>
          )}
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {category.children.map(child => (
            <TreeNode key={child.id} category={child} categories={categories} bookmarks={bookmarks} depth={depth + 1}
              selectedCategoryId={selectedCategoryId} onSelect={onSelect} onDrop={onDrop}
              onAddSub={onAddSub} onRename={onRename} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoryTree({
  categories, bookmarks, selectedCategoryId, onSelectCategory, onDropBookmark,
  onAddSubCategory, onRenameCategory, onDeleteCategory,
}: Props) {
  const { t } = useTranslation()
  const roots = buildTree(categories)

  function buildTree(cats: Category[]): TreeNode[] {
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []
    const sorted = [...cats].sort((a, b) => a.sort_order - b.sort_order)
    for (const c of sorted) map.set(c.id, { ...c, children: [] })
    for (const c of sorted) {
      const node = map.get(c.id)!
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.children.push(node)
      } else {
        roots.push(node)
      }
    }
    return roots
  }

  function handleRootDrop(e: React.DragEvent) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) onDropBookmark(id, null)
  }

  return (
    <div className="overflow-y-auto">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-1
          ${selectedCategoryId === null ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}
        onClick={() => onSelectCategory(null)}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
        onDrop={handleRootDrop}
      >
        <FolderOpen className="w-4 h-4" />
        <span className="font-medium">{t("bookmarks.allBookmarks")}</span>
        <span className="text-xs text-gray-400">{bookmarks.length}</span>
      </div>
      {roots.map(node => (
        <TreeNode key={node.id} category={node} categories={categories} bookmarks={bookmarks} depth={0}
          selectedCategoryId={selectedCategoryId} onSelect={onSelectCategory} onDrop={onDropBookmark}
          onAddSub={onAddSubCategory} onRename={onRenameCategory} onDelete={onDeleteCategory} />
      ))}
    </div>
  )
}
