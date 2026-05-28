import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '../stores/authStore'
import { useImagebedStore } from '../stores/imagebedStore'
import { imagebedApi } from '../services/api'
import { compressImage, validateImageFile } from '../utils/imageCompress'
import ImageCropper from './ImageCropper'
import UploadProgress from './UploadProgress'
import { Upload, X, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react'
import type { ImageType } from '../types'

interface ImageUploaderProps {
  type: ImageType
  value?: string
  onChange: (url: string) => void
  aspectRatio?: number
  className?: string
  placeholder?: string
  raw?: boolean
  urlSync?: boolean
}

export default function ImageUploader({
  type,
  value,
  onChange,
  aspectRatio = 1,
  className = '',
  placeholder = '点击上传',
  raw = false,
  urlSync = true,
}: ImageUploaderProps) {
  const token = useAuthStore((s) => s.token)
  const settings = useImagebedStore((s) => s.settings)

  const [showCropper, setShowCropper] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [imageSrc, setImageSrc] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'compressing' | 'uploading' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [syncUrlInput, setSyncUrlInput] = useState('')
  const [syncLoading, setSyncLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogFileInputRef = useRef<HTMLInputElement>(null)

  const handleDirectUpload = useCallback(
    async (file: File) => {
      if (!token) return

      setUploading(true)
      setUploadStatus('uploading')
      setProgress(50)

      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
        const filename = `${Date.now()}.${ext}`
        const result = await imagebedApi.upload(token, file, type, filename)

        setProgress(100)
        setUploadStatus('done')
        onChange(result.data.public_url)
        setShowEditDialog(false)

        setTimeout(() => {
          setUploading(false)
          setUploadStatus('idle')
          setProgress(0)
        }, 1500)
      } catch (err: any) {
        setUploadStatus('error')
        setErrorMessage(err.message || '上传失败')
        setUploading(false)
      }
    },
    [token, type, onChange]
  )

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!token) {
        setErrorMessage('请先登录')
        return
      }

      if (!raw) {
        const validationError = validateImageFile(file, settings || undefined)
        if (validationError) {
          setErrorMessage(validationError)
          return
        }
      }

      setErrorMessage('')

      if (raw) {
        handleDirectUpload(file)
        return
      }

      setPendingFile(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string)
        setShowCropper(true)
      }
      reader.readAsDataURL(file)
    },
    [token, settings, raw, handleDirectUpload]
  )

  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      setShowCropper(false)
      if (!pendingFile || !token) return

      setUploading(true)
      setUploadStatus('compressing')
      setProgress(0)

      try {
        const uploadBlob = raw ? croppedBlob : await compressImage(
          new File([croppedBlob], pendingFile.name, { type: croppedBlob.type }),
          type,
          settings || undefined,
          (p) => {
            setProgress(p * 50)
          }
        )

        setUploadStatus('uploading')
        setProgress(50)

        const ext = raw
          ? (pendingFile.name.split('.').pop()?.toLowerCase() || 'png')
          : type === 'icon' || type === 'avatar' ? 'png' : uploadBlob.type.includes('webp') ? 'webp' : 'jpg'
        const filename = `${Date.now()}.${ext}`

        const result = await imagebedApi.upload(token, uploadBlob, type, filename)

        setProgress(100)
        setUploadStatus('done')
        onChange(result.data.public_url)

        setTimeout(() => {
          setUploading(false)
          setUploadStatus('idle')
          setProgress(0)
        }, 1500)
      } catch (err: any) {
        setUploadStatus('error')
        setErrorMessage(err.message || '上传失败')
        setUploading(false)
      }
    },
    [pendingFile, token, type, settings, onChange, raw]
  )

  const handleCancelCrop = () => {
    setShowCropper(false)
    setPendingFile(null)
    setImageSrc('')
  }

  const handleRemove = () => {
    onChange('')
    setShowEditDialog(false)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (dialogFileInputRef.current) dialogFileInputRef.current.value = ''
  }

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            handleFileSelect(file)
          }
          break
        }
      }
    },
    [handleFileSelect]
  )

  const handleSyncUrl = async () => {
    if (!token || !syncUrlInput) return
    setSyncLoading(true)
    setErrorMessage('')
    try {
      const res = await imagebedApi.uploadByUrl(token, syncUrlInput, type)
      onChange(res.public_url)
      setShowEditDialog(false)
      setSyncUrlInput('')
    } catch (err: any) {
      setErrorMessage(err.message || '同步失败')
    } finally {
      setSyncLoading(false)
    }
  }

  const editDialog = showEditDialog && createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setShowEditDialog(false) }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
          <span className="font-semibold text-gray-900 dark:text-gray-100">替换图片</span>
          <button
            onClick={() => setShowEditDialog(false)}
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 当前图片预览 */}
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
              <img src={value} alt="当前图片" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* 上传进度 */}
          {uploading && (
            <div className="flex items-center justify-center py-2">
              <UploadProgress progress={progress} status={uploadStatus} />
            </div>
          )}

          {/* 上传区域 */}
          {!uploading && (
            <div
              onClick={() => dialogFileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`w-full py-6 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-colors
                ${dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                }`}
            >
              <Upload className="w-7 h-7 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">点击或拖拽上传新图片</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">支持粘贴图片</p>
            </div>
          )}

          {errorMessage && (
            <p className="text-sm text-red-600 text-center">{errorMessage}</p>
          )}

          {/* URL 同步 */}
          {!uploading && urlSync && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-400">或</span>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={syncUrlInput}
                  onChange={(e) => setSyncUrlInput(e.target.value)}
                  placeholder="粘贴图片 URL..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSyncUrl() }}
                />
                <button
                  type="button"
                  disabled={syncLoading || !syncUrlInput}
                  onClick={handleSyncUrl}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 flex items-center gap-1"
                >
                  <Loader2 className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                  同步
                </button>
              </div>
            </>
          )}

          {/* 删除按钮 */}
          {!uploading && (
            <button
              onClick={handleRemove}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              删除图片
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )

  return (
    <div className={`${className} overflow-hidden`} onPaste={handlePaste}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={dialogFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {showCropper && imageSrc && (
        <ImageCropper
          imageSrc={imageSrc}
          aspect={aspectRatio}
          onComplete={handleCropComplete}
          onCancel={handleCancelCrop}
        />
      )}

      {editDialog}

      {value ? (
        <div
          className="relative w-full h-full group cursor-pointer"
          onClick={() => { setShowEditDialog(true); setSyncUrlInput(''); setErrorMessage('') }}
        >
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = ''
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center pointer-events-none">
            <Upload className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ) : uploading ? (
        <div className="w-full h-full flex items-center justify-center p-1">
          <UploadProgress progress={progress} status={uploadStatus} />
        </div>
      ) : errorMessage ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-1 border border-red-300 bg-red-50 rounded-lg cursor-pointer"
          onClick={() => fileInputRef.current?.click()}>
          <p className="text-[10px] text-red-600 text-center leading-tight">{errorMessage}</p>
          <p className="text-[10px] text-blue-600 mt-0.5">点击重试</p>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
          <ImageIcon className="w-5 h-5 text-gray-400 mb-0.5 shrink-0" />
          <p className="text-[10px] text-gray-500 leading-tight text-center px-0.5">{placeholder}</p>
        </div>
      )}
    </div>
  )
}
