import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useToast } from "../components/Toast"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { useMemoStore } from "../stores/memoStore"
import { memoApi, userCategoryApi, tagApi, imagebedApi } from "../services/api"
import { Memo } from "../types"
import { Plus, Search, Trash2, Edit2, Pin, PinOff, Globe, Lock, Eye } from "lucide-react"
import Modal from "../components/Modal"
import { compressImage, validateImageFile } from "../utils/imageCompress"
import type { Editor } from "@tiptap/react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Image from "@tiptap/extension-image"
import EmptyState from "../components/EmptyState"
import PageHeader from "../components/PageHeader"
import SectionCard from "../components/SectionCard"
import FilterBar from "../components/FilterBar"

const MEMO_COLORS = [
  "#ffffff", "#fff7ed", "#fef3c7", "#dcfce7", "#dbeafe",
  "#e0e7ff", "#f3e8ff", "#fce7f3", "#fdf2f8", "#f1f5f9"
]

function EditorToolbar({ editor, onImageUpload }: { editor: Editor | null; onImageUpload?: (url: string) => void }) {
  if (!editor) return null

  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file && onImageUpload) {
        onImageUpload(file)
      }
    }
    input.click()
  }

  return (
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
      <button onClick={() => { const url = prompt("链接地址:"); if (url) editor.chain().focus().setLink({ href: url }).run() }}
        className="p-1.5 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">🔗</button>
      {onImageUpload && (
        <button onClick={handleImageUpload}
          className="p-1.5 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">️</button>
      )}
    </div>
  )
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

function TagInput({ tags, onTagsChange, value, onChange, onAdd }: {
  tags: string[]; onTagsChange: (tags: string[]) => void;
  value: string; onChange: (v: string) => void; onAdd: () => void
}) {
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
          placeholder="添加标签..."
          className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        <button onClick={add}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">添加</button>
      </div>
    </div>
  )
}

export default function Memos() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const { memos, categories, tags, setMemos, setCategories, setTags, addMemo, updateMemo, removeMemo, addCategory, addTag } = useMemoStore()
  const { toast, confirm } = useToast()

  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [pageError, setPageError] = useState("")

  const [title, setTitle] = useState("")
  const [memoColor, setMemoColor] = useState("#ffffff")
  const [category_id, setCategoryId] = useState("")
  const [memoTags, setMemoTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [categoryNameState, setCategoryNameState] = useState("")
  const [categoryColorState, setCategoryColorState] = useState("#3b82f6")
  const [isPublic, setIsPublic] = useState(false)
  const [sharePassword, setSharePassword] = useState("")

  const contentRef = useRef("")

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({ placeholder: t("memos.contentPlaceholder") }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      contentRef.current = editor.getHTML()
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-3",
      },
    },
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      const [memoRes, catRes, tagRes] = await Promise.all([
        memoApi.list(token),
        userCategoryApi.list(token),
        tagApi.list(token, "memo"),
      ])
      setMemos(memoRes)
      setCategories(catRes)
      setTags(tagRes)
      setPageError("")
    } catch (err: any) {
      setPageError(err?.message || "加载备忘录失败")
      toast(err?.message || "加载备忘录失败", "error")
    } finally {
      setLoading(false)
    }
  }

  const sortedMemos = memos
    .filter((m) => {
      const titleMatch = m.title.toLowerCase().includes(searchQuery.toLowerCase())
      const contentMatch = (m.content || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSearch = titleMatch || contentMatch
      const matchesCategory = selectedCategory === "all" || m.category_id === selectedCategory
      const matchesPinned = !showPinnedOnly || !!m.is_pinned
      return matchesSearch && matchesCategory && matchesPinned
    })
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  function resetForm() {
    setTitle("")
    contentRef.current = ""
    setMemoColor("#ffffff")
    setCategoryId("")
    setMemoTags([])
    setNewTag("")
    setIsPublic(false)
    setSharePassword("")
    editor?.commands.clearContent()
  }

  function openAddMemo() {
    resetForm()
    setShowAddModal(true)
    setTimeout(() => editor?.commands.focus(), 200)
  }

  function openEditMemo(m: Memo) {
    setEditingMemo(m)
    setTitle(m.title)
    contentRef.current = m.content || ""
    setMemoColor(m.color || "#ffffff")
    setCategoryId(m.category_id || "")
    setMemoTags(typeof m.tags === "string" ? JSON.parse(m.tags || "[]") : (m.tags || []))
    setIsPublic(!!m.is_public)
    setSharePassword(m.share_password || "")
    setShowEditModal(true)
    setTimeout(() => editor?.commands.setContent(m.content || ""), 200)
  }

  async function handleAddMemo() {
    if (!token || !title.trim()) return
    try {
      const res = await memoApi.create(token, {
        title, content: contentRef.current, color: memoColor,
        category_id: category_id || null, tags: memoTags,
        is_public: isPublic ? 1 : 0, share_password: sharePassword || null,
      })
      addMemo(res)
      setShowAddModal(false)
      resetForm()
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleUpdateMemo() {
    if (!token || !editingMemo || !title.trim()) return
    try {
      const res = await memoApi.update(token, editingMemo.id, {
        title, content: contentRef.current, color: memoColor,
        category_id: category_id || null, tags: memoTags,
        is_public: isPublic ? 1 : 0, share_password: sharePassword || null,
      })
      updateMemo(editingMemo.id, res)
      setShowEditModal(false)
      setEditingMemo(null)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleDeleteMemo(id: string) {
    if (!token || !await confirm(t("memos.deleteConfirm"))) return
    try {
      await memoApi.delete(token, id)
      removeMemo(id)
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handlePinMemo(id: string) {
    if (!token) return
    try {
      const res = await memoApi.pin(token, id)
      updateMemo(id, { is_pinned: res.is_pinned })
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  async function handleEditorImageUpload(file: File) {
    if (!token || !editor) return
    try {
      const validationError = validateImageFile(file)
      if (validationError) {
        toast(validationError)
        return
      }

      const compressedBlob = await compressImage(file, 'memo')
      const filename = `memo_${Date.now()}.${compressedBlob.type.includes('webp') ? 'webp' : 'jpg'}`
      const uploadToken = await imagebedApi.getUploadToken(token, 'memo', filename)

      await fetch(uploadToken.upload_url, {
        method: 'PUT',
        body: compressedBlob,
        headers: { 'Content-Type': compressedBlob.type },
      })

      editor.chain().focus().setImage({ src: uploadToken.public_url }).run()
    } catch (err: any) {
      toast(err.message || '图片上传失败', "error")
    }
  }

  async function handleAddCategory() {
    if (!token || !categoryNameState.trim()) return
    try {
      const res = await userCategoryApi.create(token, { name: categoryNameState, color: categoryColorState })
      addCategory(res)
      setShowCategoryModal(false)
      setCategoryNameState("")
      setCategoryColorState("#3b82f6")
    } catch (err: any) {
      toast(err.message || t("common.error"), "error")
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader title={t("memos.title")} description="记录灵感与资料，支持富文本、置顶和公开分享。" />

      <SectionCard className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex gap-2">
            <button onClick={() => setShowCategoryModal(true)} className="ui-btn ui-btn-ghost">
            {t("categories.add")}
          </button>
            <button onClick={openAddMemo} className="ui-btn ui-btn-primary bg-green-600 hover:bg-green-700 text-white">
            <Plus className="w-4 h-4" />{t("memos.add")}
          </button>
        </div>
        </div>
      </SectionCard>

      <SectionCard className="mb-6">
      <FilterBar className="items-stretch">
        <div className="relative min-w-0 w-full lg:basis-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder={t("memos.search")} value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ui-input h-11 w-full pl-10 pr-4" />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
          className="ui-select h-11 w-full px-4 sm:w-auto sm:min-w-[180px]">
          <option value="all">{t("bookmarks.allCategories")}</option>
          {categories.filter(c => c.type === "memo").map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button onClick={() => setShowPinnedOnly((prev) => !prev)} className={`${showPinnedOnly ? "ui-btn ui-btn-primary" : "ui-btn ui-btn-ghost"} h-11 w-full sm:w-auto`}>
          仅看置顶
        </button>
      </FilterBar>
      </SectionCard>

      {pageError ? (
        <EmptyState title="加载失败" description={pageError} tone="error" />
      ) : null}

      {!pageError && sortedMemos.length === 0 ? (
        <EmptyState
          title={searchQuery || selectedCategory !== "all" || showPinnedOnly ? "没有匹配备忘录" : t("memos.noMemos")}
          description={searchQuery || selectedCategory !== "all" || showPinnedOnly ? "试试切换分类、关键词或取消置顶筛选。" : "可先新建一条备忘录，支持富文本和图片。"}
          icon={<Pin className="w-6 h-6" />}
          action={!searchQuery && selectedCategory === "all" && !showPinnedOnly ? <button onClick={openAddMemo} className="ui-btn ui-btn-primary">{t("memos.addFirst")}</button> : undefined}
        />
      ) : !pageError ? (
        <div className="space-y-4">
          {sortedMemos.map((m) => (
            <div key={m.id} className="rounded-lg shadow-md dark:shadow-gray-900/30 p-4 hover:shadow-lg transition border-l-4"
              style={{ borderLeftColor: m.color || "#e5e7eb", backgroundColor: m.color === "#ffffff" ? "#fff" : m.color + "15" }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button onClick={() => handlePinMemo(m.id)} className="text-gray-400 dark:text-gray-500 hover:text-yellow-500 flex-shrink-0">
                    {m.is_pinned ? <Pin className="w-4 h-4 fill-current text-yellow-500" /> : <PinOff className="w-4 h-4" />}
                  </button>
                  {m.is_pinned && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded flex-shrink-0">{t("memos.pinned")}</span>}
                  {m.is_public ? (
                    <span className="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded flex-shrink-0 flex items-center gap-1">
                      {m.share_password ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                      {t("memos.public") || "公开"}
                    </span>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate(`/memo/${m.id}`)} className="text-left w-full">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate hover:text-blue-600">{m.title}</h3>
                    </button>
                    {m.category_id && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded mt-1 inline-block">
                        {categories.find(c => c.id === m.category_id)?.name || t("common.noCategory")}
                      </span>
                    )}
                    {(() => {
                      const tagsArr = typeof m.tags === "string" ? JSON.parse(m.tags || "[]") : (m.tags || [])
                      return tagsArr.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded ml-1 inline-block">#{tag}</span>
                      ))
                    })()}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => navigate(`/memo/${m.id}`)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600" title={t("common.view") || "查看"}><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEditMemo(m)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteMemo(m.id)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
              {m.content && (
                <button onClick={() => navigate(`/memo/${m.id}`)} className="text-left w-full">
                  <div className="text-sm text-gray-600 dark:text-gray-400 prose prose-sm max-w-none mb-1 line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: m.content }} />
                </button>
              )}
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(m.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      ) : null}

      <Modal show={showAddModal} title={t("memos.add")} onClose={() => setShowAddModal(false)}>
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
              <EditorToolbar editor={editor} onImageUpload={handleEditorImageUpload} />
              <EditorContent editor={editor} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.color")}</label>
            <ColorPicker value={memoColor} onChange={setMemoColor} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.category")}</label>
            <select value={category_id} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">{t("common.noCategory")}</option>
              {categories.filter(c => c.type === "memo").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.tags")}</label>
            <TagInput tags={memoTags} onTagsChange={setMemoTags} value={newTag} onChange={setNewTag} onAdd={() => {}} />
          </div>
          <div className="border-t dark:border-gray-700 pt-4">
            <label className="flex items-center gap-2 mb-3">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("memos.makePublic") || "公开分享"}</span>
            </label>
            {isPublic && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.sharePassword") || "访问密码（可选）"}</label>
                <input type="text" value={sharePassword} onChange={(e) => setSharePassword(e.target.value)}
                  placeholder={t("memos.passwordPlaceholder") || "留空则无需密码"}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button>
            <button onClick={handleAddMemo} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">{t("common.save")}</button>
          </div>
        </div>
      </Modal>

      <Modal show={showEditModal} title={t("memos.edit")} onClose={() => { setShowEditModal(false); setEditingMemo(null) }}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.title")}</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.content")}</label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <EditorToolbar editor={editor} onImageUpload={handleEditorImageUpload} />
              <EditorContent editor={editor} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.color")}</label>
            <ColorPicker value={memoColor} onChange={setMemoColor} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("bookmarks.category")}</label>
            <select value={category_id} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">{t("common.noCategory")}</option>
              {categories.filter(c => c.type === "memo").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.tags")}</label>
            <TagInput tags={memoTags} onTagsChange={setMemoTags} value={newTag} onChange={setNewTag} onAdd={() => {}} />
          </div>
          <div className="border-t dark:border-gray-700 pt-4">
            <label className="flex items-center gap-2 mb-3">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("memos.makePublic") || "公开分享"}</span>
            </label>
            {isPublic && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("memos.sharePassword") || "访问密码（可选）"}</label>
                <input type="text" value={sharePassword} onChange={(e) => setSharePassword(e.target.value)}
                  placeholder={t("memos.passwordPlaceholder") || "留空则无需密码"}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => { setShowEditModal(false); setEditingMemo(null) }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button>
            <button onClick={handleUpdateMemo} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button>
          </div>
        </div>
      </Modal>

      <Modal show={showCategoryModal} title={t("categories.add")} onClose={() => setShowCategoryModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("categories.name")}</label>
            <input type="text" value={categoryNameState} onChange={(e) => setCategoryNameState(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("categories.color")}</label>
            <input type="color" value={categoryColorState} onChange={(e) => setCategoryColorState(e.target.value)}
              className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg" />
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => setShowCategoryModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t("common.cancel")}</button>
            <button onClick={handleAddCategory} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
