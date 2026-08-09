import type { Metadata } from "next";
import { SectionHeading } from "@/components/common/Display";
import { ProductBrowser } from "@/components/products";
import { phones } from "@/lib/data/phones";
import { categoryBySlug } from "@/lib/types";

export const metadata: Metadata = {
  title: "Phones",
  description:
    "Phones ranked on the camera you actually use and the battery you actually get — every score derived from the specification, not from a press release.",
  alternates: { canonical: "/phones" },
};

export default function PhonesPage() {
  const meta = categoryBySlug.get("phone")!;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <SectionHeading
        align="left"
        eyebrow={`${phones.length} phones`}
        title="Find a phone that fits how you use one"
        description={meta.tagline}
      />
      <ProductBrowser products={phones} className="mt-8" />
    </div>
  );
}
