import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../stores/authStore"
import { useMemoStore } from "../stores/memoStore"
import { memoApi, categoryApi, tagApi } from "../services/api"
import { Memo, Category, Tag } from "../types"
import { Plus, Search, Trash2, Edit2, X, CornerUpLeft, Star } from "lucide-react"

// Import Tiptap
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

  // Form states
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [memoColor, setMemoColor] = useState("#ffffff")
  const [category_id, setCategoryId] = useState("")
  const [memoTags, setMemoTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

  // Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: t("memos.contentPlaceholder"),
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setContent(html)
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-1",
      },
    },
  })

  useEffect(() => {
    loadData()
    return () => {
      editor?.destroy()
    }
  }, [])

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      const [memoRes, catRes, tagRes] = await Promise.all([
        memoApi.list(token),
        categoryApi.list(token),
        tagApi.list(token),
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

  const filteredMemos = memos.filter((m) => {
    const titleMatch = m.title.toLowerCase().includes(searchQuery.toLowerCase())
    const contentMatch = (m.content || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSearch = titleMatch || contentMatch
    const matchesCategory = selectedCategory === "all" || m.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Sort: pinned first, then by date
  const sortedMemos = [...filteredMemos].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  async function handleAddMemo() {
    if (!token || !title) return
    try {
      const res = await memoApi.create(token, {
        title,
        content,
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

  async function handleUpdateMemo() {
    if (!token || !editingMemo) return
    try {
      const res = await memoApi.update(token, editingMemo.id, {
        title,
        content,
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

  async function handlePinMemo(id: string, current: number) {
    if (!token) return
    try {
      const res = await memoApi.pin(id)
      updateMemo(id, res)
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  async function handleAddCategory() {
    if (!token || !categoryNameState) return
    try {
      const res = await categoryApi.create(token, { name: categoryNameState, color: categoryColorStateState, type: "memo" })
      addCategory(res)
      setShowCategoryModal(false)
      setCategoryNameState("")
      setCategoryColorState("#3b82f6")
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  async function handleAddTag() {
    if (!token || !newTag) return
    try {
      const res = await tagApi.create(token, { name: newTag, type: "memo" })
      addTag(res)
      setNewTag("")
    } catch (err: any) {
      alert(err.message || t("common.error"))
    }
  }

  function openEditMemo(m: Memo) {
    setEditingMemo(m)
    setTitle(m.title)
    setContent(m.content || "")
    setMemoColor(m.color || "#ffffff")
    setCategoryId(m.category_id || "")
    const parsed = typeof m.tags === "string" ? JSON.parse(m.tags || "[]") : (m.tags || [])
    setMemoTags(parsed)

    // Update editor content
    if (editor) {
      editor.commands.setContent(m.content || "")
    }
    setShowEditModal(true)
  }

  function openAddMemo() {
    setTitle("")
    setContent("")
    setMemoColor("#ffffff")
    setCategoryId("")
    setMemoTags([])
    setTimeout(() => {
      if (editor) {
        editor.commands.clearContent()
        editor.commands.focus()
      }
    }, 100)
    setShowAddModal(true)
  }

  function removeTag(index: number) {
    setMemoTags(memoTags.filter((_, i) => i !== index))
  }

  function addTagToList() {
    if (newTag.trim() && !memoTags.includes(newTag.trim())) {
      setMemoTags([...memoTags, newTag.trim()])
      setNewTag("")
    }
  }

  function resetForm() {
    setTitle("")
    setContent("")
    setMemoColor("#ffffff")
    setCategoryId("")
    setMemoTags([])
    setNewTag("")
    if (editor) {
      editor.commands.clearContent()
    }
  }

  // Local state for category modal
  const [categoryNameState, setCategoryNameState] = useState("")
  const [categoryColorStateState, setCategoryColorState] = useState("#3b82f6")

  const Modal = ({ show, title, children }: { show: boolean; title: string; children: React.ReactNode }) => {
    if (!show) return null
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={() => { setShowAddModal(false); setShowEditModal(false); setShowCategoryModal(false) }} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    )
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t("memos.title")}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            {t("categories.add")}
          </button>
          <button
            onClick={openAddMemo}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("memos.add")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t("memos.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
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
          <button onClick={openAddMemo} className="text-blue-600 hover:text-blue-700 font-medium">
            {t("memos.addFirst")}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMemos.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg shadow-md p-4 hover:shadow-lg transition border-l-4 ${
                m.color || "#ffffff"
              }`}
              style={{
                borderLeftColor: m.color || "#ffffff",
                backgroundColor: m.color === "#ffffff" ? "#fff" : m.color + "15",
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button onClick={() => handlePinMemo(m.id, m.is_pinned)} className="text-gray-400 hover:text-yellow-500">
                    {m.is_pinned ? <Star className="w-4 h-5 fill-current text-yellow-500" /> : <CornerUpLeft className="w-4 h-4" />}
                  </button>
                  {m.is_pinned && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{t("memos.pinned")}</span>}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{m.title}</h3>
                    {m.category_id && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded mt-1 inline-block">
                        {categories.find(c => c.id === m.category_id)?.name || t("common.noCategory")}
                      </span>
                    )}
                    {m.tags && typeof m.tags === "string" && JSON.parse(m.tags).slice(0, 3).map((tag: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded ml-1 inline-block">#{tag}</span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditMemo(m)} className="p-1 text-gray-500 hover:text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteMemo(m.id)} className="p-1 text-gray-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div
                className="text-sm text-gray-600 prose prose-sm max-w-none mb-1"
                dangerouslySetInnerHTML={{ __html: (m.content || "").substring(0, 300) }}
              />
              {(m.content || "").length > 300 && <span className="text-xs text-blue-500">...</span>}
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                <span>{new Date(m.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Memo Modal */}
      <Modal show={showAddModal} title={t("memos.add")}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.title")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("memos.titlePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.content")}</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Tiptap toolbar */}
              <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap">
                <button
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-1 rounded ${editor?.isActive("bold") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-200"}`}
                  title="Bold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 5h6a3 3 0 016 0v6H7zM7 5a3 3 0 013-3h0a3 3 0 013 3v6H7zM7 5H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-3" />
                  </svg>
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-1 rounded ${editor?.isActive("italic") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-200"}`}
                  title="Italic"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={`p-1 rounded ${editor?.isActive("underline") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-200"}`}
                  title="Underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`p-1 rounded text-gray-600 hover:bg-gray-200`}
                  title="Heading"
                >
                  H
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`p-1 rounded text-gray-600 hover:bg-gray-200`}
                  title="Bullet List"
                >
                  •≡
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`p-1 rounded text-gray-600 hover:bg-gray-200`}
                  title="Ordered List"
                >
                  1.
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  className={`p-1 rounded text-gray-600 hover:bg-gray-200`}
                  title="Quote"
                >
                  ❝
                </button>
                <button
                  onClick={() => {
                    const url = prompt("Enter link URL:")
                    if (url) editor?.chain().focus().setLink({ href: url }).run()
                  }}
                  className={`p-1 rounded text-gray-600 hover:bg-gray-200`}
                  title="Link"
                >
                  🔗
                </button>
              </div>
              <EditorContent editor={editor} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.color")}</label>
            <div className="flex gap-2 flex-wrap">
              {MEMO_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setMemoColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition ${
                    memoColor === c
                      ? "border-blue-600 scale-110"
                      : "border-gray-300 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.category")}</label>
            <select
              value={category_id}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">{t("common.noCategory")}</option>
              {categories.filter(c => c.type === "memo").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.tags")}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {memoTags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                  #{tag}
                  <button onClick={() => removeTag(i)} className="text-red-500 hover:text-red-700">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTagToList()
                  }
                }}
                placeholder={t("tags.namePlaceholder")}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <button onClick={addTagToList} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                {t("tags.add")}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              {t("common.cancel")}
            </button>
            <button onClick={handleAddMemo} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              {t("common.save")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Memo Modal */}
      <Modal show={showEditModal} title={t("memos.edit")}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.title")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.content")}</label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap">
                <button
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-1 rounded ${editor?.isActive("bold") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 5h6a3 3 0 016 0v6H7z" />
                  </svg>
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-1 rounded ${editor?.isActive("italic") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={`p-1 rounded ${editor?.isActive("underline") ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-200"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10" />
                  </svg>
                </button>
              </div>
              <EditorContent editor={editor} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.color")}</label>
            <div className="flex gap-2 flex-wrap">
              {MEMO_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setMemoColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition ${
                    memoColor === c ? "border-blue-600 scale-110" : "border-gray-300 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("bookmarks.category")}</label>
            <select
              value={category_id}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">{t("common.noCategory")}</option>
              {categories.filter(c => c.type === "memo").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("memos.tags")}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {memoTags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                  #{tag}
                  <button onClick={() => removeTag(i)} className="text-red-500 hover:text-red-700">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTagToList()
                  }
                }}
                placeholder={t("tags.namePlaceholder")}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <button onClick={addTagToList} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                {t("tags.add")}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => { setShowEditModal(false); setEditingMemo(null) }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              {t("common.cancel")}
            </button>
            <button onClick={handleUpdateMemo} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {t("common.save")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Category Modal */}
      <Modal show={showCategoryModal} title={t("categories.add")}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("categories.name")}</label>
            <input
              type="text"
              value={categoryNameState}
              onChange={(e) => setCategoryNameState(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("categories.color")}</label>
            <input
              type="color"
              value={categoryColorStateState}
              onChange={(e) => setCategoryColorState(e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => setShowCategoryModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              {t("common.cancel")}
            </button>
            <button onClick={handleAddCategory} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {t("common.save")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}