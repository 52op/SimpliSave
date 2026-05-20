import { useState, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useImagebedStore } from '../stores/imagebedStore'
import { imagebedApi } from '../services/api'
import { compressImage, validateImageFile } from '../utils/imageCompress'
import ImageCropper from './ImageCropper'
import UploadProgress from './UploadProgress'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import type { ImageType } from '../types'

interface ImageUploaderProps {
  type: ImageType
  value?: string
  onChange: (url: string) => void
  aspectRatio?: number
  className?: string
  placeholder?: string
}

export default function ImageUploader({
  type,
  value,
  onChange,
  aspectRatio = 1,
  className = '',
  placeholder = '点击上传',
}: ImageUploaderProps) {
  const token = useAuthStore((s) => s.token)
  const settings = useImagebedStore((s) => s.settings)

  const [showCropper, setShowCropper] = useState(false)
  const [imageSrc, setImageSrc] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'compressing' | 'uploading' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!token) {
        setErrorMessage('请先登录')
        return
      }

      const validationError = validateImageFile(file, settings || undefined)
      if (validationError) {
        setErrorMessage(validationError)
        return
      }

      setErrorMessage('')
      setPendingFile(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string)
        setShowCropper(true)
      }
      reader.readAsDataURL(file)
    },
    [token, settings]
  )

  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      setShowCropper(false)
      if (!pendingFile || !token) return

      setUploading(true)
      setUploadStatus('compressing')
      setProgress(0)

      try {
        const compressedBlob = await compressImage(
          new File([croppedBlob], pendingFile.name, { type: croppedBlob.type }),
          type,
          settings || undefined,
          (p) => {
            setProgress(p * 50)
          }
        )

        setUploadStatus('uploading')
        setProgress(50)

        const ext = type === 'icon' || type === 'avatar' ? 'png' : compressedBlob.type.includes('webp') ? 'webp' : 'jpg'
        const filename = `${type}_${Date.now()}.${ext}`

        const result = await imagebedApi.upload(token, compressedBlob, type, filename)

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
    [pendingFile, token, type, settings, onChange]
  )

  const handleCancelCrop = () => {
    setShowCropper(false)
    setPendingFile(null)
    setImageSrc('')
  }

  const handleRemove = () => {
    onChange('')
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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

  return (
    <div className={`${className} overflow-hidden`} onPaste={handlePaste}>
      <input
        ref={fileInputRef}
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

      {value ? (
        <div className="relative w-full h-full group">
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = ''
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
            <button onClick={handleRemove}
              className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <X className="w-3 h-3" />
            </button>
            <Upload className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
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
          className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
          <ImageIcon className="w-5 h-5 text-gray-400 mb-0.5 shrink-0" />
          <p className="text-[10px] text-gray-500 leading-tight text-center px-0.5">{placeholder}</p>
        </div>
      )}
    </div>
  )
}
