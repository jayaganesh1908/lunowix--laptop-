import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/products/ProductDetail";
import { getPhoneById, relatedPhones } from "@/lib/data/phones";
import { formatPrice } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const phone = getPhoneById(id);

  if (!phone) return { title: "Phone not found" };

  return {
    title: phone.name,
    description: `${phone.name} — ${phone.specs.chipset}, ${phone.specs.ram}GB RAM, ${phone.specs.camera.main.mp}MP main camera at ${formatPrice(phone.price)}. ${phone.summary}`,
    alternates: { canonical: `/phones/${phone.id}` },
    openGraph: {
      title: `${phone.name} · Lunowix`,
      description: phone.summary,
      images: [{ url: phone.image, width: 1200, height: 900, alt: phone.name }],
    },
  };
}

export default async function PhoneDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const phone = getPhoneById(id);

  if (!phone) notFound();

  return <ProductDetail product={phone} related={relatedPhones(phone, 4)} />;
}
