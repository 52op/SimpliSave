import { useState } from "react"

// 根据标题生成稳定的背景色
function getAvatarColor(title: string): string {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500",
    "bg-indigo-500", "bg-teal-500", "bg-orange-500", "bg-cyan-500",
    "bg-rose-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500",
  ]
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

interface FaviconProps {
  src?: string | null
  title: string
  size?: "sm" | "md" | "lg"
}

const sizeMap = {
  sm: "w-5 h-5 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
}

export default function Favicon({ src, title, size = "md" }: FaviconProps) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = sizeMap[size]
  const firstChar = (title || "?").charAt(0).toUpperCase()

  // 没有 src 或图片加载失败 → 显示首字符
  if (!src || imgError) {
    return (
      <div
        className={`${sizeClass} ${getAvatarColor(title)} rounded flex-shrink-0 flex items-center justify-center text-white font-bold`}
      >
        {firstChar}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      className={`${sizeClass} rounded flex-shrink-0 object-cover`}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  )
}
