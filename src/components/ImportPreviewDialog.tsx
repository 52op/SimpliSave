import { useState } from "react"
import { useTranslation } from "react-i18next"
import Modal from "./Modal"

interface PreviewData {
  total: number
  existing_categories: string[]
  new_categories: string[]
  all_categories: string[]
  uncategorized_count: number
}

interface Props {
  preview: PreviewData
  onConfirm: (renameMap: Record<string, string>) => void
  onCancel: () => void
}

export default function ImportPreviewDialog({ preview, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  const [renameMap, setRenameMap] = useState<Record<string, string>>({})
  const [renameInputs, setRenameInputs] = useState<Record<string, string>>({})

  function handleRenameChange(path: string, value: string) {
    setRenameInputs(prev => ({ ...prev, [path]: value }))
    if (value.trim()) {
      setRenameMap(prev => ({ ...prev, [path]: value.trim() }))
    } else {
      const next = { ...renameMap }
      delete next[path]
      setRenameMap(next)
    }
  }

  return (
    <Modal show={true} title={t("bookmarks.importPreviewTitle")} widthClass="max-w-2xl" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span dangerouslySetInnerHTML={{ __html: t("bookmarks.importDetected", { count: preview.total }) }} />
          {preview.uncategorized_count > 0 && t("bookmarks.importUncategorized", { count: preview.uncategorized_count })}
        </p>

        {preview.existing_categories.length > 0 && (
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
              {t("bookmarks.importConflictHeading")}
            </p>
            <div className="space-y-3">
              {preview.existing_categories.map(path => (
                <div key={path} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-sm font-mono text-gray-700 dark:text-gray-300 mb-2">{path}</div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <input type="radio" name={path} value="merge" defaultChecked
                      onChange={() => {
                        const next = { ...renameMap }
                        delete next[path]
                        setRenameMap(next)
                      }} />
                    {t("bookmarks.importMerge")}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input type="radio" name={path} value="rename"
                      onChange={() => {
                        const val = renameInputs[path]?.trim()
                        if (val) setRenameMap(prev => ({ ...prev, [path]: val }))
                      }} />
                    {t("bookmarks.importRename")}
                    <input type="text" placeholder={t("bookmarks.importRenamePlaceholder")}
                      className="ml-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm w-48"
                      value={renameInputs[path] || ''}
                      onChange={e => handleRenameChange(path, e.target.value)} />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {preview.new_categories.length > 0 && (
          <div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">{t("bookmarks.importNewHeading")}</p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
              {preview.new_categories.map(path => <li key={path}>{path}</li>)}
            </ul>
          </div>
        )}

        {preview.existing_categories.length === 0 && preview.new_categories.length === 0 && !preview.uncategorized_count && (
          <p className="text-sm text-gray-500">{t("bookmarks.importNothing")}</p>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
            {t("bookmarks.importCancel")}
          </button>
          <button onClick={() => onConfirm(renameMap)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            {t("bookmarks.importConfirm")}
          </button>
        </div>
      </div>
    </Modal>
  )
}
