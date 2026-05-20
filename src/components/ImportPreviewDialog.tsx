import { useState } from "react"
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
    <Modal show={true} title="导入预览" widthClass="max-w-2xl" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          共检测到 <strong>{preview.total}</strong> 条书签
          {preview.uncategorized_count > 0 && `，其中 ${preview.uncategorized_count} 条无分类`}
        </p>

        {preview.existing_categories.length > 0 && (
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
              以下分类路径已存在，请选择处理方式：
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
                    合并到现有分类
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input type="radio" name={path} value="rename"
                      onChange={() => {
                        const val = renameInputs[path]?.trim()
                        if (val) setRenameMap(prev => ({ ...prev, [path]: val }))
                      }} />
                    重命名为
                    <input type="text" placeholder="输入新分类名"
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
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">将新建以下分类：</p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
              {preview.new_categories.map(path => <li key={path}>{path}</li>)}
            </ul>
          </div>
        )}

        {preview.existing_categories.length === 0 && preview.new_categories.length === 0 && !preview.uncategorized_count && (
          <p className="text-sm text-gray-500">没有发现分类或未分类书签。</p>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
            取消
          </button>
          <button onClick={() => onConfirm(renameMap)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            确认导入
          </button>
        </div>
      </div>
    </Modal>
  )
}
