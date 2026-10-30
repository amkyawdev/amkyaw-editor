export type SkeletonProps = {
  className?: string
  /** Number of shimmering rows to render. */
  rows?: number
}

/** Shimmer placeholder used while media metadata resolves. */
export const Skeleton = ({ className = '', rows = 1 }: SkeletonProps) => (
  <div className={`flex flex-col gap-2 ${className}`} aria-hidden>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="shimmer h-12 rounded-card border border-edge bg-surface2" />
    ))}
  </div>
)
