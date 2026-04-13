export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
      <div className="flex items-center gap-2 mt-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
