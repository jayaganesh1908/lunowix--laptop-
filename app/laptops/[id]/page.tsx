import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BatteryCharging,
  Cpu,
  HardDrive,
  MemoryStick,
  Monitor,
  MonitorPlay,
  Package,
  Weight,
} from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { PriceCheckedAt } from "@/components/common/PriceCheckedAt";
import { Rating } from "@/components/common/Rating";
import { ReviewCard } from "@/components/common/ReviewCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { LaptopCard } from "@/components/laptops/LaptopCard";
import { ImageGallery } from "@/components/details/ImageGallery";
import { SpecsTable } from "@/components/details/SpecsTable";
import { PerformanceScores } from "@/components/details/PerformanceScores";
import { GamesSupported } from "@/components/details/GamesSupported";
import { SoftwareCompatibility } from "@/components/details/SoftwareCompatibility";
import { LaptopActions } from "@/components/details/LaptopActions";
import { getLaptopById, laptops, relatedLaptops } from "@/lib/data/laptops";
import {
  discountPercent,
  formatBattery,
  formatPrice,
  formatStorage,
  formatWeight,
  shortCpu,
  shortGpu,
} from "@/lib/utils/formatters";

/*
 * Every laptop is pre-rendered at build time.
 *
 * This was removed once, with the note "the root layout reads the session
 * cookie, which makes every route dynamic". That was true then and is not now:
 * the session read went with Supabase, and `app/layout.tsx` says so itself —
 * "that call was the only thing forcing every route to be dynamic". The
 * workaround outlived its cause. The catalogue is a static module, so there is
 * nothing left to defer to request time.
 */
export function generateStaticParams() {
  return laptops.map((laptop) => ({ id: laptop.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const laptop = getLaptopById(id);

  if (!laptop) return { title: "Laptop not found" };

  return {
    title: laptop.name,
    description: `${laptop.name} — ${shortCpu(laptop.specs.processor)}, ${shortGpu(laptop.specs.gpu)}, ${laptop.specs.ram}GB RAM at ${formatPrice(laptop.price)}. ${laptop.summary}`,
    alternates: { canonical: `/laptops/${laptop.id}` },
    openGraph: {
      title: `${laptop.name} · Lunowix`,
      description: laptop.summary,
      images: [{ url: laptop.image, width: 1200, height: 900, alt: laptop.name }],
    },
  };
}

export default async function LaptopDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const laptop = getLaptopById(id);

  if (!laptop) notFound();

  const discount = discountPercent(laptop.price, laptop.mrp);
  const related = relatedLaptops(laptop, 4, laptops);

  const highlights = [
    { icon: Cpu, label: "Processor", value: shortCpu(laptop.specs.processor) },
    { icon: MonitorPlay, label: "Graphics", value: shortGpu(laptop.specs.gpu) },
    { icon: MemoryStick, label: "Memory", value: `${laptop.specs.ram} GB` },
    { icon: HardDrive, label: "Storage", value: formatStorage(laptop.specs.storage) },
    {
      icon: Monitor,
      label: "Display",
      value: `${laptop.specs.display.size}" · ${laptop.specs.display.refreshRate}Hz`,
    },
    { icon: BatteryCharging, label: "Battery", value: formatBattery(laptop.specs.battery) },
    { icon: Weight, label: "Weight", value: formatWeight(laptop.specs.weight) },
    { icon: Package, label: "Ports", value: `${laptop.specs.ports.length} total` },
  ];

  // Product structured data for richer search results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: laptop.name,
    brand: { "@type": "Brand", name: laptop.brand },
    description: laptop.summary,
    image: laptop.images,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: laptop.rating,
      reviewCount: laptop.reviews,
    },
    offers: {
      "@type": "Offer",
      price: laptop.price,
      priceCurrency: "INR",
      availability: laptop.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <article className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Laptops", href: "/laptops" },
          { label: laptop.brand, href: `/laptops?brands=${laptop.brand}` },
          { label: laptop.name },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
        <ImageGallery images={laptop.images} alt={laptop.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{laptop.brand}</Badge>
            {laptop.bestseller ? <Badge tone="success">Bestseller</Badge> : null}
            {laptop.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {laptop.name}
          </h1>

          <div className="mt-3">
            <Rating value={laptop.rating} count={laptop.reviews} size="md" />
          </div>

          <p className="mt-4 text-base leading-relaxed text-ink-600 dark:text-ink-300">
            {laptop.summary}
          </p>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-3xl font-bold tabular-nums">
              {formatPrice(laptop.price)}
            </span>
            {discount > 0 ? (
              <>
                <span className="font-mono text-lg text-ink-500 line-through dark:text-ink-400">
                  {formatPrice(laptop.mrp)}
                </span>
                <Badge tone="success">{discount}% off</Badge>
              </>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            Inclusive of all taxes · {laptop.specs.warranty}
          </p>
          <PriceCheckedAt product={laptop} className="mt-0.5 block" />

          <LaptopActions laptop={laptop} className="mt-7" />

          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {highlights.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-ink-900/5 bg-ink-50/70 px-3 py-3 dark:border-white/10 dark:bg-ink-950/40"
              >
                <dt className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold" title={value}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <section id="performance" className="mt-16 scroll-mt-24">
        <SectionHeading
          align="left"
          eyebrow="Scores"
          title="Performance breakdown"
          description="Modelled from the silicon, memory, storage and panel in this configuration."
        />
        <PerformanceScores scores={laptop.performance} className="mt-6" />
      </section>

      <section id="games" className="mt-16 scroll-mt-24">
        <SectionHeading
          align="left"
          eyebrow="Gaming"
          title="Games supported"
          description="Ten titles people actually play, with the preset each one is comfortable at."
        />
        <GamesSupported benchmarks={laptop.games} className="mt-6" />
      </section>

      <section id="software" className="mt-16 scroll-mt-24">
        <SectionHeading
          align="left"
          eyebrow="Compatibility"
          title="Software compatibility"
          description="Rated on the weakest of CPU, GPU and memory headroom — the thing that actually bottlenecks each app."
        />
        <SoftwareCompatibility compatibility={laptop.software} className="mt-6" />
      </section>

      <section id="specs" className="mt-16 scroll-mt-24">
        <SectionHeading align="left" eyebrow="Details" title="Full specifications" />
        <SpecsTable specs={laptop.specs} className="mt-6" />
      </section>

      <section id="reviews" className="mt-16 scroll-mt-24">
        <SectionHeading
          align="left"
          eyebrow="Owners"
          title="What buyers say"
          description={`${laptop.reviews.toLocaleString("en-IN")} ratings, averaging ${laptop.rating.toFixed(1)} out of 5.`}
        />
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {laptop.reviewList.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </section>

      {related.length ? (
        <section className="mt-16">
          <SectionHeading
            align="left"
            eyebrow="Alternatives"
            title="You might also consider"
            action={
              <Link
                href="/laptops"
                className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                Browse all
              </Link>
            }
          />
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((item) => (
              <LaptopCard key={item.id} laptop={item} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
