export function SkeletonCard({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ui-card p-4">
          <div className="flex items-start gap-3">
            <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-full" />
            </div>
          </div>
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
