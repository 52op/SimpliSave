import { useTranslation } from "react-i18next"

export default function TagInput({ tags, onTagsChange, value, onChange }: {
  tags: string[]; onTagsChange: (tags: string[]) => void;
  value: string; onChange: (v: string) => void
}) {
  const { t } = useTranslation()
  const add = () => {
    if (value.trim() && !tags.includes(value.trim())) {
      onTagsChange([...tags, value.trim()])
      onChange("")
    }
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded">
            #{tag}
            <button onClick={() => onTagsChange(tags.filter((_, j) => j !== i))} className="text-red-500 dark:text-red-400 hover:text-red-700">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          placeholder={t("memos.tagsPlaceholder")}
          className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        <button onClick={add}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">{t("common.add")}</button>
      </div>
    </div>
  )
}
