import { useState, useEffect, useRef } from "react"
import { Search, ChevronDown } from "lucide-react"
import { pinyinMatch } from "../utils/pinyin"
import type { CardGroup } from "../types"

interface GroupSelectorProps {
  groups: CardGroup[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  className?: string
}

export default function GroupSelector({ groups, value, onChange, placeholder, className }: GroupSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = search
    ? groups.filter(g => pinyinMatch(g.title, search) || pinyinMatch(g.category_name || "", search))
    : groups

  const grouped = new Map<string, CardGroup[]>()
  for (const g of filtered) {
    const cat = g.category_name || "未分类"
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(g)
  }

  const selected = value ? groups.find(g => g.id === value) : null

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch("") }}
        className="w-full border rounded-lg px-3 py-2 flex items-center gap-2 bg-white dark:bg-gray-800 text-sm text-left"
      >
        <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
          {selected ? selected.title : (placeholder || "选择卡片组...")}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700 rounded">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索卡片组..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 ${!value ? "text-blue-600 font-medium" : "text-gray-500 dark:text-gray-400"}`}
            >
              {placeholder || "不指定"}
            </button>
            {Array.from(grouped.entries()).map(([cat, items]) => (
              <div key={cat}>
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/50">
                  {cat}
                </div>
                {items.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { onChange(g.id); setOpen(false); setSearch("") }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 truncate ${value === g.id ? "text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">无匹配结果</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}