import { LaptopGridSkeleton } from "@/components/common/LoadingSkeleton";
import { Skeleton } from "@/components/common/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-10 w-80" />
      <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      <div className="mt-10">
        <LaptopGridSkeleton count={9} />
      </div>
    </div>
  );
}
