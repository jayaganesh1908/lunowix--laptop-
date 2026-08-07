import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { LaptopGridSkeleton } from "@/components/common/LoadingSkeleton";
import { SearchResults } from "@/components/search/SearchResults";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search every laptop by name, brand, processor, graphics, budget, supported game or software.",
  alternates: { canonical: "/search" },
};

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Search" }]} />

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Search</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
        One box for everything — hardware, price brackets, the games you play and the
        apps you use.
      </p>

      <div className="mt-8">
        <Suspense fallback={<LaptopGridSkeleton count={6} />}>
          <SearchResults />
        </Suspense>
      </div>
    </div>
  );
}
