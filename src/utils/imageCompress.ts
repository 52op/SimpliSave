import imageCompression from 'browser-image-compression'
import type { ImageType, ImagebedSettings } from '../types'

const DEFAULT_SETTINGS: ImagebedSettings = {
  id: 'global',
  icon_max_width: 128, icon_max_height: 128, icon_quality: 80,
  cover_max_width: 800, cover_max_height: 600, cover_quality: 85,
  memo_max_width: 1200, memo_max_height: 1200, memo_quality: 85,
  avatar_max_width: 256, avatar_max_height: 256, avatar_quality: 85,
  max_file_size_mb: 10,
  allowed_formats: 'image/jpeg,image/png,image/webp,image/gif',
  convert_to_webp: 1,
  updated_at: '',
}

function getSettingsForType(type: ImageType, settings: ImagebedSettings) {
  const s = settings || DEFAULT_SETTINGS
  switch (type) {
    case 'icon':
      return { maxWidth: s.icon_max_width, maxHeight: s.icon_max_height, quality: s.icon_quality }
    case 'cover':
      return { maxWidth: s.cover_max_width, maxHeight: s.cover_max_height, quality: s.cover_quality }
    case 'memo':
      return { maxWidth: s.memo_max_width, maxHeight: s.memo_max_height, quality: s.memo_quality }
    case 'avatar':
      return { maxWidth: s.avatar_max_width, maxHeight: s.avatar_max_height, quality: s.avatar_quality }
    default:
      return { maxWidth: 1200, maxHeight: 1200, quality: 85 }
  }
}

export async function compressImage(
  file: File,
  type: ImageType,
  settings?: ImagebedSettings,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const s = getSettingsForType(type, settings)
  const convertToWebP = (settings?.convert_to_webp ?? 1) === 1

  const options = {
    maxSizeMB: (settings?.max_file_size_mb ?? 10),
    maxWidthOrHeight: Math.max(s.maxWidth, s.maxHeight),
    useWebWorker: true,
    fileType: convertToWebP ? 'image/webp' : undefined,
    onProgress,
  }

  return imageCompression(file, options)
}

export function validateImageFile(file: File, settings?: ImagebedSettings): string | null {
  const s = settings || DEFAULT_SETTINGS
  const allowedFormats = s.allowed_formats.split(',').map(f => f.trim())

  if (!allowedFormats.includes(file.type)) {
    return `不支持的图片格式: ${file.type}。支持的格式: ${allowedFormats.join(', ')}`
  }

  const maxSizeBytes = s.max_file_size_mb * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return `文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB > ${s.max_file_size_mb}MB`
  }

  return null
}

export function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(blob)
  })
}

export function cropImage(
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  targetWidth?: number,
  targetHeight?: number
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = targetWidth || crop.width
    canvas.height = targetHeight || crop.height

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    canvas.toBlob((blob) => {
      resolve(blob!)
    }, 'image/png')
  })
}
