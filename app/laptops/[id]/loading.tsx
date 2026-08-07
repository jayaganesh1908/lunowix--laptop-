import { DetailsSkeleton, Skeleton } from "@/components/common/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-64" />
      <div className="mt-8">
        <DetailsSkeleton />
      </div>
    </div>
  );
}
