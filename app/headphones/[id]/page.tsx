import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/products/ProductDetail";
import { getHeadphoneById, headphones, relatedHeadphones } from "@/lib/data/headphones";
import { formatPrice } from "@/lib/utils";

/** Pre-rendered at build time — see the note in the laptop detail route. */
export function generateStaticParams() {
  return headphones.map((headphone) => ({ id: headphone.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const headphone = getHeadphoneById(id);

  if (!headphone) return { title: "Headphones not found" };

  const anc = headphone.specs.anc === "None" ? "no ANC" : headphone.specs.anc;

  return {
    title: headphone.name,
    description: `${headphone.name} — ${headphone.specs.form}, ${anc}, ${headphone.specs.driver.size}mm driver at ${formatPrice(headphone.price)}. ${headphone.summary}`,
    alternates: { canonical: `/headphones/${headphone.id}` },
    openGraph: {
      title: `${headphone.name} · Lunowix`,
      description: headphone.summary,
      images: [{ url: headphone.image, width: 1200, height: 900, alt: headphone.name }],
    },
  };
}

export default async function HeadphoneDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const headphone = getHeadphoneById(id);

  if (!headphone) notFound();

  return <ProductDetail product={headphone} related={relatedHeadphones(headphone, 4)} />;
}
