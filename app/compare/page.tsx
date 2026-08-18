import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { CompareWorkspace } from "@/components/compare/CompareWorkspace";

export const metadata: Metadata = {
  title: "Compare products",
  description:
    "Put two laptops, phones or headphones side by side — the specs that matter for each, with the better figure highlighted in every row.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Compare" }]} />

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Compare side by side
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
        Pick any two laptops, phones or headphones — each against its own kind, since
        a chipset and a GPU have nothing to say to each other. Every row is scored, and
        the stronger of the pair is marked so the trade-offs are obvious at a glance.
      </p>

      {/* `CompareWorkspace` reads `?a=` and `?b=` to seed a shared comparison,
          and `useSearchParams` opts a route out of static rendering unless it
          sits inside a boundary. Without this the whole page would be rendered
          per request for the sake of two optional params. */}
      <div className="mt-8">
        <Suspense fallback={<div className="h-[26rem]" />}>
          <CompareWorkspace />
        </Suspense>
      </div>
    </div>
  );
}
