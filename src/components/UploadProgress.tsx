interface UploadProgressProps {
  progress: number
  status?: 'uploading' | 'compressing' | 'cropping' | 'done' | 'error'
  message?: string
}

export default function UploadProgress({ progress, status = 'uploading', message }: UploadProgressProps) {
  const statusText = {
    uploading: '上传中...',
    compressing: '压缩中...',
    cropping: '裁剪中...',
    done: '上传完成',
    error: '上传失败',
  }

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{message || statusText[status]}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            status === 'error' ? 'bg-red-500' : status === 'done' ? 'bg-green-500' : 'bg-blue-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
