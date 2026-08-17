import type { Metadata } from "next";
import { Suspense } from "react";
import { LaptopsBrowser } from "@/components/laptops/LaptopsBrowser";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { LaptopGridSkeleton } from "@/components/common/LoadingSkeleton";
/* Static catalogue directly. `lib/db/catalogue` wrapped Supabase and fell
   back to exactly this list whenever credentials were absent — which was
   always, in practice. */
import { laptops } from "@/lib/data/laptops";

export const metadata: Metadata = {
  title: "All laptops",
  description:
    "Filter every laptop by brand, processor, graphics, memory, display and price — with gaming and software scores on every card.",
  alternates: { canonical: "/laptops" },
};

export default async function LaptopsPage() {
  const catalogue = laptops;

  return (
    <>
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Laptops" }]} />
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Every laptop we track
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
          {catalogue.length} machines across seven brands, scored for coding, gaming,
          editing, battery, display and AI work. Filters are written to the URL, so any
          view you land on can be shared.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8">
            <LaptopGridSkeleton count={9} />
          </div>
        }
      >
        <LaptopsBrowser catalogue={catalogue} />
      </Suspense>
    </>
  );
}
