import { useState, useRef, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import ImageExt from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import { imagebedApi } from "../services/api"
import { useImagebedStore } from "../stores/imagebedStore"
import { Category } from "../types"
import { compressImage, validateImageFile } from "../utils/imageCompress"
import ImageUploader from "./ImageUploader"
import { useToast } from "./Toast"

const MEMO_COLORS = [
  "#ffffff", "#fff7ed", "#fef3c7", "#dcfce7", "#dbeafe",
  "#e0e7ff", "#f3e8ff", "#fce7f3", "#fdf2f8", "#f1f5f9"
]

export interface MemoFormData {
  title: string
  content: string
  color: string
  cover_image: string | null
  category_id: string | null
  tags: string[]
  is_public: number
  share_password: string | null
}

interface MemoFormProps {
  initialData?: {
    title?: string
    content?: string
    color?: string
    cover_image?: string | null
    category_id?: string | null
    tags?: string[] | string
    is_public?: number
    share_password?: string | null
  }
  onSave: (data: MemoFormData) => Promise<void>
  onCancel: () => void
  categories: Category[]
  token: string
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {MEMO_COLORS.map((c) => (
        <button key={c} onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full border-2 transition ${value === c ? "border-blue-600 scale-110" : "border-gray-300 dark:border-gray-500 hover:scale-105"}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  )
}

function TagInput({ tags, onTagsChange, value, onChange }: {
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

function LinkModal({ show, onConfirm, onCancel }: {
  show: boolean; onConfirm: (url: string) => void; onCancel: () => void
}) {
  const [url, setUrl] = useState("")
  const { t } = useTranslation()
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-xl w-80" onClick={(e) => e.stopPropagation()}>
        <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">{t("common.edit") || "Edit"} Link</h4>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-3 text-sm"
          autoFocus onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onConfirm(url) } }} />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button>
          <button onClick={() => onConfirm(url)} disabled={!url.trim()} className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{t("common.confirm")}</button>
        </div>
      </div>
    </div>
  )
}

function EditorToolbar({ editor, onImageUpload, uploading }: {
  editor: any
  onImageUpload: (file: File) => void
  uploading: boolean
}) {
  const [showLink, setShowLink] = useState(false)
  if (!editor) return null

  const handleImageClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) onImageUpload(file)
    }
    input.click()
  }

  return (
    <>
      <div className="flex items-center gap-1 p-2 border-b bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 flex-wrap">
        <button onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded text-sm ${editor.isActive("bold") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>B</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded text-sm italic ${editor.isActive("italic") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>I</button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded text-sm underline ${editor.isActive("underline") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>U</button>
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded text-sm font-bold ${editor.isActive("heading", { level: 2 }) ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>H</button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded text-sm ${editor.isActive("bulletList") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>•≡</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded text-sm ${editor.isActive("orderedList") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>1.</button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded text-sm ${editor.isActive("blockquote") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>"</button>
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button onClick={() => setShowLink(true)}
          className={`p-1.5 rounded text-sm ${editor.isActive("link") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>🔗</button>
        <button
          onClick={handleImageClick}
          disabled={uploading}
          title="插入图片（支持粘贴/拖拽）"
          className={`p-1.5 rounded text-sm ${uploading ? "opacity-40 cursor-not-allowed" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
        >
          {uploading ? "⏳" : "🖼️"}
        </button>
      </div>
      <LinkModal show={showLink} onConfirm={(url) => { if (url) { editor.chain().focus().setLink({ href: url }).run() }; setShowLink(false) }} onCancel={() => setShowLink(false)} />
    </>
  )
}

/** 从 HTML 内容中提取第一张图片的 src */
function extractFirstImageSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match ? match[1] : null
}

export default function MemoForm({ initialData, onSave, onCancel, categories, token }: MemoFormProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const settings = useImagebedStore((s) => s.settings)

  const [title, setTitle] = useState(initialData?.title || "")
  const [memoColor, setMemoColor] = useState(initialData?.color || "#ffffff")
  const [coverImage, setCoverImage] = useState<string>(initialData?.cover_image || "")
  const [categoryId, setCategoryId] = useState(initialData?.category_id || "")
  const initialTags = (() => {
    const tags = initialData?.tags
    if (!tags) return []
    if (Array.isArray(tags)) return tags
    try { return JSON.parse(tags) } catch { return [] }
  })()
  const [memoTags, setMemoTags] = useState<string[]>(initialTags)
  const [newTag, setNewTag] = useState("")
  const [isPublic, setIsPublic] = useState(!!initialData?.is_public)
  const [sharePassword, setSharePassword] = useState(initialData?.share_password || "")
  const [saving, setSaving] = useState(false)
  const [imgUploading, setImgUploading] = useState(false)

  const contentRef = useRef(initialData?.content || "")
  const editorRef = useRef<any>(null)

  const uploadImageToEditor = useCallback(async (file: File, editor: any) => {
    if (!token || !editor) return
    const validationError = validateImageFile(file, settings || undefined)
    if (validationError) {
      toast(validationError, "error")
      return
    }
    setImgUploading(true)
    try {
      const compressedBlob = await compressImage(file, 'memo', settings || undefined)
      const ext = compressedBlob.type.includes('webp') ? 'webp' : 'jpg'
      const filename = `memo_${Date.now()}.${ext}`
      const result = await imagebedApi.upload(token, compressedBlob, 'memo', filename)
      editor.chain().focus().setImage({ src: result.data.public_url }).run()
    } catch (err: any) {
      toast(err.message || "图片上传失败", "error")
    } finally {
      setImgUploading(false)
    }
  }, [token, settings, toast])

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExt,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: t("memos.contentPlaceholder") }),
    ],
    content: initialData?.content || "",
    onUpdate: ({ editor }) => {
      contentRef.current = editor.getHTML()
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-3",
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) uploadImageToEditor(file, editorRef.current)
            return true
          }
        }
        return false
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files
        if (!files?.length) return false
        const imageFile = Array.from(files).find(f => f.type.startsWith('image/'))
        if (!imageFile) return false
        event.preventDefault()
        uploadImageToEditor(imageFile, editorRef.current)
        return true
      },
    },
  })

  // 保持 ref 同步，供 handlePaste/handleDrop 闭包安全访问
  useEffect(() => { editorRef.current = editor }, [editor])

  async function handleSubmit() {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const content = contentRef.current
      // 无封面时自动提取内容中第一张图
      const finalCover = coverImage || extractFirstImageSrc(content) || null
      await onSave({
        title: title.trim(),
        content,
        color: memoColor,
        cover_image: finalCover,
        category_id: categoryId || null,
        tags: memoTags,
        is_public: isPublic ? 1 : 0,
        share_password: sharePassword || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.title")}</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={t("memos.titlePlaceholder")}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.content")}</label>
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <EditorToolbar editor={editor} onImageUpload={(file) => uploadImageToEditor(file, editor)} uploading={imgUploading} />
          <EditorContent editor={editor} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">支持粘贴或拖拽图片自动上传插入</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          封面图
          <span className="ml-1.5 text-xs font-normal text-gray-400">（不设置时自动取内容第一张图）</span>
        </label>
        <ImageUploader
          type="memo"
          value={coverImage}
          onChange={setCoverImage}
          aspectRatio={16 / 9}
          className="w-full h-28 rounded-lg"
          placeholder="点击上传封面图"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.color")}</label>
        <ColorPicker value={memoColor} onChange={setMemoColor} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.category")}</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">{t("common.noCategory")}</option>
          {categories.filter(c => c.type === "memo").map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.tags")}</label>
        <TagInput tags={memoTags} onTagsChange={setMemoTags} value={newTag} onChange={setNewTag} />
      </div>
      <div className="border-t dark:border-gray-700 pt-4">
        <label className="flex items-center gap-2 mb-3">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("memos.makePublic")}</span>
        </label>
        {isPublic && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.sharePassword")}</label>
            <input type="text" value={sharePassword} onChange={(e) => setSharePassword(e.target.value)}
              placeholder={t("memos.passwordPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-4">
        <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button>
        <button onClick={handleSubmit} disabled={!title.trim() || saving} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </div>
  )
}
