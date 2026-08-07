import type { Metadata } from "next";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { CompareWorkspace } from "@/components/compare/CompareWorkspace";

export const metadata: Metadata = {
  title: "Compare laptops",
  description:
    "Put two laptops side by side — processor, graphics, memory, display, battery, ports and performance scores, with the better figure highlighted in every row.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Compare" }]} />

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Compare two laptops
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
        Pick any two machines from the catalogue. Every row is scored, and the stronger
        of the pair is marked so the trade-offs are obvious at a glance.
      </p>

      <div className="mt-8">
        <CompareWorkspace />
      </div>
    </div>
  );
}
