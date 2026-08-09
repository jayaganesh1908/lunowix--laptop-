import type { Metadata } from "next";
import { SectionHeading } from "@/components/common/Display";
import { ProductBrowser } from "@/components/products";
import { headphoneFacets, headphones } from "@/lib/data/headphones";
import { categoryBySlug } from "@/lib/types";

export const metadata: Metadata = {
  title: "Headphones",
  description:
    "Headphones judged on isolation, comfort and codec support — the things you notice by hour three, not the ones on the box.",
  alternates: { canonical: "/headphones" },
};

export default function HeadphonesPage() {
  const meta = categoryBySlug.get("headphone")!;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <SectionHeading
        align="left"
        eyebrow={`${headphones.length} sets`}
        title="Headphones, rated on how they wear"
        description={meta.tagline}
      />
      <ProductBrowser
        products={headphones}
        facet={{ label: "Form", field: "form", values: headphoneFacets.forms }}
        className="mt-8"
      />
    </div>
  );
}
