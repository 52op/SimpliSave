import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { useMemoStore } from "../stores/memoStore"
import { memoApi, userCategoryApi, tagApi } from "../services/api"
import { Memo } from "../types"
import { Plus, Search, Trash2, Edit2, X, Pin, PinOff, Tag as TagIcon } from "lucide-react"

// Tiptap
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"

const MEMO_COLORS = [
  "#ffffff", "#fff7ed", "#fef3c7", "#dcfce7", "#dbeafe",
  "#e0e7ff", "#f3e8ff", "#fce7f3", "#fdf2f8", "#f1f5f9"
]

export default function Memos() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const { memos, categories, tags, setMemos, setCategories, setTags, addMemo, updateMemo, removeMemo, addCategory, addTag } = useMemoStore()

  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // 表单状态
  const [title, setTitle] = useState("")
  const [memoColor, setMemoColor] = useState("#ffffff")
  const [category_id, setCategoryId] = useState("")
  const [memoTags, setMemoTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [categoryNameState, setCategoryNameState] = useState("")
  const [categoryColorState, setCategoryColorState] = useState("#3b82f6")

  // 用 ref 存储编辑器内容，避免频繁 re-render 导致光标丢失
  const contentRef = useRef("")

  // Tiptap 编辑器 - 只创建一次
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
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

  useEffect(() => {
    loadData()
  }, [])

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
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setLoading(false)
    }
  }

  // 搜索和排序
  const sortedMemos = memos
    .filter((m) => {
      const titleMatch = m.title.toLowerCase().includes(searchQuery.toLowerCase())
      const contentMatch = (m.content || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSearch = titleMatch || contentMatch
      const matchesCategory = selectedCategory === "all" || m.category_id === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  // 重置表单
  function resetForm() {
    setTitle("")
    contentRef.current = ""
    setMemoColor("#ffffff")
    setCategoryId("")
    setMemoTags([])
    setNewTag("")
    editor?.commands.clearContent()
  }

  // 打开添加 Modal
  function openAddMemo() {
    resetForm()
    setShowAddModal(true)
    setTimeout(() => editor?.commands.focus(), 200)
  }

  // 打开编辑 Modal
  function openEditMemo(m: Memo) {
    setEditingMemo(m)
    setTitle(m.title)
    contentRef.current = m.content || ""
    setMemoColor(m.color || "#ffffff")
    setCategoryId(m.category_id || "")
    setMemoTags(typeof m.tags === "string" ? JSON.parse(m.tags || "[]") : (m.tags || []))
    setShowEditModal(true)
    setTimeout(() => editor?.commands.setContent(m.content || ""), 200)
  }

  // 添加备忘录
  async function handleAddMemo() {
    if (!token || !title.trim()) return
    try {
      const res = await memoApi.create(token, {
        title,
        content: contentRef.current,
        color: memoColor,
        category_id: category_id || null,
        tags: memoTags,
      })
      addMemo(res)
      setShowAddModal(false)
      resetForm()
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  // 更新备忘录
  async function handleUpdateMemo() {
    if (!token || !editingMemo || !title.trim()) return
    try {
      const res = await memoApi.update(token, editingMemo.id, {
        title,
        content: contentRef.current,
        color: memoColor,
        category_id: category_id || null,
        tags: memoTags,
      })
      updateMemo(editingMemo.id, res)
      setShowEditModal(false)
      setEditingMemo(null)
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  // 删除备忘录
  async function handleDeleteMemo(id: string) {
    if (!token) return
    if (!confirm(t("memos.deleteConfirm"))) return
    try {
      await memoApi.delete(token, id)
      removeMemo(id)
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  // 置顶/取消置顶
  async function handlePinMemo(id: string, current: number) {
    if (!token) return
    try {
      const res = await memoApi.pin(token, id)
      updateMemo(id, { is_pinned: res.is_pinned })
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  // 添加分类
  async function handleAddCategory() {
    if (!token || !categoryNameState.trim()) return
    try {
      const res = await userCategoryApi.create(token, { name: categoryNameState, color: categoryColorState })
      addCategory(res)
      setShowCategoryModal(false)
      setCategoryNameState("")
      setCategoryColorState("#3b82f6")
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  // 标签操作
  function addTagToList() {
    if (newTag.trim() && !memoTags.includes(newTag.trim())) {
      setMemoTags([...memoTags, newTag.trim()])
      setNewTag("")
    }
  }
  function removeTag(index: number) {
    setMemoTags(memoTags.filter((_, i) => i !== index))
  }

  // Modal 组件
  const Modal = ({ show, title, children, onClose }: { show: boolean; title: string; children: React.ReactNode; onClose: () => void }) => {
    if (!show) return null
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    )
  }

  // 编辑器工具栏
  const EditorToolbar = () => (
    <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap">
      <button onClick={() => editor?.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded text-sm ${editor?.isActive("bold") ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200"}`}>B</button>
      <button onClick={() => editor?.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded text-sm italic ${editor?.isActive("italic") ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200"}`}>I</button>
      <button onClick={() => editor?.chain().focus().toggleUnderline().run()}
        className={`p-1.5 rounded text-sm underline ${editor?.isActive("underline") ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200"}`}>U</button>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded text-sm font-bold ${editor?.isActive("heading", { level: 2 }) ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200"}`}>H</button>
      <button onClick={() => editor?.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded text-sm ${editor?.isActive("bulletList") ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200"}`}>•≡</button>
      <button onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded text-sm ${editor?.isActive("orderedList") ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200"}`}>1.</button>
      <button onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 rounded text-sm ${editor?.isActive("blockquote") ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200"}`}>"</button>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <button onClick={() => { const url = prompt("链接地址:"); if (url) editor?.chain().focus().setLink({ href: url }).run() }}
        className="p-1.5 rounded text-sm text-gray-600 hover:bg-gray-200">🔗</button>
    </div>
  )

  // 颜色选择器
  const ColorPicker = ({ value, onChange }: { value: string; onChange: (c: string) => void }) => (
    <div className="flex gap-2 flex-wrap">
      {MEMO_COLORS.map((c) => (
        <button key={c} onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full border-2 transition ${value === c ? "border-blue-600 scale-110" : "border-gray-300 hover:scale-105"}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  )

  // 标签输入
  const TagInput = ({ tags: currentTags, onTagsChange }: { tags: string[]; onTagsChange: (tags: string[]) => void }) => (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {currentTags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
            #{tag}
            <button onClick={() => onTagsChange(currentTags.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newTag.trim() && !currentTags.includes(newTag.trim())) { onTagsChange([...currentTags, newTag.trim()]); setNewTag("") } } }}
          placeholder={t("tags.namePlaceholder")}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        <button onClick={() => { if (newTag.trim() && !currentTags.includes(newTag.trim())) { onTagsChange([...currentTags, newTag.trim()]); setNewTag("") } }}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">{t("tags.add")}</button>
      </div>
    </div>
  )

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t("memos.title")}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCategoryModal(true)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            {t("categories.add")}
          </button>
          <button onClick={openAddMemo} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />{t("memos.add")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder={t("memos.search")} value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">{t("bookmarks.allCategories")}</option>
          {categories.filter(c => c.type === "memo").map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Memo List */}
      {sortedMemos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-2">{t("memos.noMemos")}</p>
          <button onClick={openAddMemo} className="text-blue-600 hover:text-blue-700 font-medium">{t("memos.addFirst")}</button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMemos.map((m) => (
            <div key={m.id} className="rounded-lg shadow-md p-4 hover:shadow-lg transition border-l-4"
              style={{ borderLeftColor: m.color || "#e5e7eb", backgroundColor: m.color === "#ffffff" ? "#fff" : m.color + "15" }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button onClick={() => handlePinMemo(m.id, m.is_pinned)} className="text-gray-400 hover:text-yellow-500 flex-shrink-0">
                    {m.is_pinned ? <Pin className="w-4 h-4 fill-current text-yellow-500" /> : <PinOff className="w-4 h-4" />}
                  </button>
                  {m.is_pinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex-shrink-0">{t("memos.pinned")}</span>}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{m.title}</h3>
                    {m.category_id && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded mt-1 inline-block">
                        {categories.find(c => c.id === m.category_id)?.name || t("common.noCategory")}
                      </span>
                    )}
                    {(() => {
                      const tagsArr = typeof m.tags === "string" ? JSON.parse(m.tags || "[]") : (m.tags || [])
                      return tagsArr.slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded ml-1 inline-block">#{tag}</span>
                      ))
                    })()}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEditMemo(m)} className="p-1 text-gray-500 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteMemo(m.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
              {m.content && (
                <div className="text-sm text-gray-600 prose prose-sm max-w-none mb-1 line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: m.content }} />
              )}
              <div className="text-xs text-gray-400 mt-2">{new Date(m.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* ========== Add Memo Modal ========== */}
      <Modal show={showAddModal} title={t("memos.add")} onClose={() => setShowAddModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.title")}</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={t("memos.titlePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.content")}</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <EditorToolbar />
              <EditorContent editor={editor} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.color")}</label>
            <ColorPicker value={memoColor} onChange={setMemoColor} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.category")}</label>
            <select value={category_id} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">{t("common.noCategory")}</option>
              {categories.filter(c => c.type === "memo").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.tags")}</label>
            <TagInput tags={memoTags} onTagsChange={setMemoTags} />
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
            <button onClick={handleAddMemo} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">{t("common.save")}</button>
          </div>
        </div>
      </Modal>

      {/* ========== Edit Memo Modal ========== */}
      <Modal show={showEditModal} title={t("memos.edit")} onClose={() => { setShowEditModal(false); setEditingMemo(null) }}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.title")}</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.content")}</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <EditorToolbar />
              <EditorContent editor={editor} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.color")}</label>
            <ColorPicker value={memoColor} onChange={setMemoColor} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.category")}</label>
            <select value={category_id} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">{t("common.noCategory")}</option>
              {categories.filter(c => c.type === "memo").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.tags")}</label>
            <TagInput tags={memoTags} onTagsChange={setMemoTags} />
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => { setShowEditModal(false); setEditingMemo(null) }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
            <button onClick={handleUpdateMemo} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button>
          </div>
        </div>
      </Modal>

      {/* ========== Add Category Modal ========== */}
      <Modal show={showCategoryModal} title={t("categories.add")} onClose={() => setShowCategoryModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("categories.name")}</label>
            <input type="text" value={categoryNameState} onChange={(e) => setCategoryNameState(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("categories.color")}</label>
            <input type="color" value={categoryColorState} onChange={(e) => setCategoryColorState(e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-lg" />
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => setShowCategoryModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
            <button onClick={handleAddCategory} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t("common.save")}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
