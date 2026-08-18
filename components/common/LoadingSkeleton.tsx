import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("shimmer-surface rounded-lg", className)}
    />
  );
}

export function LaptopCardSkeleton() {
  return (
    <div className="card-surface overflow-hidden p-4">
      <Skeleton className="aspect-4/3 w-full rounded-xl" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-4/5" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-7 w-28" />
      </div>
    </div>
  );
}

export function LaptopGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading laptops"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <LaptopCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div role="status" aria-label="Loading laptop" className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <Skeleton className="aspect-4/3 w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-12 w-40" />
        <div className="grid grid-cols-2 gap-3 pt-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
