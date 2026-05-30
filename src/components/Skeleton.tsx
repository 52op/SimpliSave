export function SkeletonCard({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-x-3 gap-y-4 md:grid-cols-[repeat(auto-fill,minmax(72px,1fr))] md:gap-x-7 md:gap-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div className="skeleton w-14 h-14 rounded-xl" />
          <div className="skeleton h-3 w-12 rounded" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCategory({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-9 w-20 rounded-full" />
      ))}
    </div>
  )
}
