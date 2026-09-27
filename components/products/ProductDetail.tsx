import Link from "next/link";
import { Badge, Breadcrumb, Rating, ReviewCard, SectionHeading } from "@/components/common/Display";
import { ProductReviews } from "@/components/reviews/ProductReviews";
import { PriceCheckedAt } from "@/components/common/PriceCheckedAt";
import { ProductViewer } from "@/components/three/ProductViewer";
import { ProductCard, ProductScores } from "./index";
import { categoryFor, type Product } from "@/lib/types";
import { cn, discountPercent, formatPrice, formatStorage } from "@/lib/utils";

const TIER_TONE = {
  Flawless: "success",
  Excellent: "success",
  Playable: "info",
  Struggles: "danger",
} as const;

const VERDICT_TONE = {
  Excellent: "success",
  Good: "info",
  Adequate: "warning",
  Poor: "danger",
} as const;

export function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const meta = categoryFor(product);
  const discount = discountPercent(product.price, product.mrp);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    description: product.summary,
    image: product.images,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviews,
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      availability: product.inStock
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
          { label: meta.pluralLabel, href: `/${meta.route}` },
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
        <ProductViewer params={product.model3d} images={product.images} alt={product.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{product.brand}</Badge>
            {product.bestseller ? <Badge tone="success">Bestseller</Badge> : null}
            {product.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>

          <div className="mt-3">
            <Rating value={product.rating} count={product.reviews} size="md" />
          </div>

          <p className="mt-4 text-base leading-relaxed text-ink-600 dark:text-ink-300">
            {product.summary}
          </p>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-3xl font-bold tabular-nums">
              {formatPrice(product.price)}
            </span>
            {discount > 0 ? (
              <>
                <span className="font-mono text-lg text-ink-500 line-through dark:text-ink-400">
                  {formatPrice(product.mrp)}
                </span>
                <Badge tone="success">{discount}% off</Badge>
              </>
            ) : null}
          </div>
          <PriceCheckedAt product={product} className="mt-1 block" />

          <div className="mt-8">
            <ProductScores product={product} />
          </div>
        </div>
      </div>

      {/* Phones carry mobile benchmarks; headphones carry scenario ratings. */}
      {product.category === "phone" ? (
        <section id="games" className="mt-16 scroll-mt-24">
          <SectionHeading
            align="left"
            eyebrow="Gaming"
            title="Games it can handle"
            description="Frame rates modelled from the GPU tier and how well the chip holds its clocks."
          />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {product.games.map((game) => (
              <div key={game.id} className="card-surface flex items-center gap-3 p-4">
                <span className="text-2xl" aria-hidden>
                  {game.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{game.name}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    {game.fps} fps · {game.graphics}
                  </p>
                </div>
                <Badge tone={TIER_TONE[game.tier]}>{game.tier}</Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {product.category === "headphone" ? (
        <section id="use-cases" className="mt-16 scroll-mt-24">
          <SectionHeading
            align="left"
            eyebrow="In practice"
            title="What they are good for"
            description="The same five measurements, re-weighted for the situation you would actually use them in."
          />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {product.useCases.map((useCase) => (
              <div key={useCase.id} className="card-surface flex items-center gap-3 p-4">
                <span className="text-2xl" aria-hidden>
                  {useCase.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{useCase.name}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">{useCase.score}/100</p>
                </div>
                <Badge tone={VERDICT_TONE[useCase.verdict]}>{useCase.verdict}</Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section id="specs" className="mt-16 scroll-mt-24">
        <SectionHeading align="left" eyebrow="Details" title="Full specifications" />
        <ProductSpecs product={product} className="mt-6" />
      </section>

      <section id="reviews" className="mt-16 scroll-mt-24">
        <SectionHeading
          align="left"
          eyebrow="Owners"
          title="What buyers say"
          description={`${product.reviews.toLocaleString("en-IN")} ratings, averaging ${product.rating.toFixed(1)} out of 5.`}
        />
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {product.reviewList.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {/* Reader reviews and the write form. Client-side and loaded after paint,
            so this route stays statically pre-rendered. */}
        <ProductReviews productId={product.id} />
      </section>

      {related.length ? (
        <section className="mt-16">
          <SectionHeading
            align="left"
            eyebrow="Alternatives"
            title="You might also consider"
            action={
              <Link
                href={`/${meta.route}`}
                className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                Browse all
              </Link>
            }
          />
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

export interface SpecGroup {
  title: string;
  rows: { label: string; value: string }[];
}

const yesNo = (value: boolean) => (value ? "Yes" : "No");

/**
 * The full specification, grouped for reading rather than dumped as one table.
 *
 * Each category describes itself: switching on the discriminant means a phone
 * can never accidentally render a "Ports" row, and adding a field to one
 * catalogue cannot silently blank a row in another.
 */
export function specGroups(product: Product): SpecGroup[] {
  switch (product.category) {
    case "laptop": {
      const s = product.specs;
      return [
        {
          title: "Performance",
          rows: [
            { label: "Processor", value: s.processor },
            { label: "Cores", value: `${s.cores}` },
            { label: "Graphics", value: s.gpu },
            { label: "Video memory", value: s.gpuVram > 0 ? `${s.gpuVram} GB` : "Shared" },
            { label: "Memory", value: `${s.ram} GB ${s.ramType}` },
            { label: "Storage", value: `${formatStorage(s.storage)} ${s.storageType}` },
          ],
        },
        {
          title: "Display",
          rows: [
            { label: "Size", value: `${s.display.size}"` },
            { label: "Resolution", value: s.display.resolution },
            { label: "Refresh rate", value: `${s.display.refreshRate} Hz` },
            { label: "Panel", value: s.display.panel },
            { label: "Touchscreen", value: yesNo(s.display.touch) },
          ],
        },
        {
          title: "Body & connectivity",
          rows: [
            { label: "Weight", value: `${s.weight} kg` },
            { label: "Battery", value: `${s.battery} hours rated` },
            { label: "Keyboard", value: s.keyboard },
            { label: "Webcam", value: s.webcam },
            { label: "Wi-Fi", value: s.wifi },
            { label: "Bluetooth", value: s.bluetooth },
            { label: "Ports", value: s.ports.join(" · ") },
            { label: "Operating system", value: s.os },
            { label: "Warranty", value: s.warranty },
          ],
        },
      ];
    }

    case "phone": {
      const s = product.specs;
      const cam = s.camera;
      const lens = (label: string, c?: { mp: number; aperture: number; ois: boolean; label: string }) =>
        c
          ? [{ label, value: `${c.mp}MP ${c.label} · f/${c.aperture}${c.ois ? " · OIS" : ""}` }]
          : [];

      return [
        {
          title: "Performance",
          rows: [
            { label: "Chipset", value: s.chipset },
            { label: "Fabrication", value: `${s.process} nm` },
            { label: "Cores", value: `${s.cores}` },
            { label: "GPU", value: s.gpu },
            { label: "Memory", value: `${s.ram} GB` },
            { label: "Storage", value: `${formatStorage(s.storage)} ${s.storageType}` },
          ],
        },
        {
          title: "Display",
          rows: [
            { label: "Size", value: `${s.display.size}"` },
            { label: "Resolution", value: s.display.resolution },
            { label: "Refresh rate", value: `${s.display.refreshRate} Hz` },
            { label: "Panel", value: s.display.panel },
            { label: "Peak brightness", value: `${s.display.brightness} nits` },
            { label: "Protection", value: s.display.protection },
          ],
        },
        {
          title: "Camera",
          rows: [
            ...lens("Main", cam.main),
            ...lens("Ultrawide", cam.ultrawide),
            ...lens("Telephoto", cam.telephoto),
            { label: "Optical zoom", value: cam.opticalZoom > 1 ? `${cam.opticalZoom}x` : "None" },
            ...lens("Front", cam.front),
            { label: "Max video", value: cam.maxVideo },
          ],
        },
        {
          title: "Battery & body",
          rows: [
            { label: "Capacity", value: `${s.battery} mAh` },
            { label: "Wired charging", value: `${s.charging} W` },
            {
              label: "Wireless charging",
              value: s.wirelessCharging > 0 ? `${s.wirelessCharging} W` : "Not supported",
            },
            { label: "Weight", value: `${s.weight} g` },
            { label: "Thickness", value: `${s.thickness} mm` },
            { label: "Build", value: s.build },
            { label: "Water resistance", value: s.waterResistance },
            { label: "Colours", value: s.colors.join(" · ") },
          ],
        },
        {
          title: "Software & connectivity",
          rows: [
            { label: "Operating system", value: `${s.os} — ${s.osVersion}` },
            { label: "Promised upgrades", value: `${s.osUpdates} major versions` },
            { label: "SIM", value: s.sim },
            { label: "5G", value: yesNo(s.fiveG) },
            { label: "Headphone jack", value: yesNo(s.headphoneJack) },
            { label: "Expandable storage", value: yesNo(s.expandableStorage) },
            { label: "Warranty", value: s.warranty },
          ],
        },
      ];
    }

    case "headphone": {
      const s = product.specs;
      return [
        {
          title: "Audio",
          rows: [
            { label: "Form factor", value: s.form },
            { label: "Connection", value: s.connection },
            { label: "Driver", value: `${s.driver.size}mm ${s.driver.type}` },
            { label: "Frequency response", value: s.driver.frequencyResponse },
            { label: "Impedance", value: `${s.driver.impedance} Ω` },
            { label: "Codecs", value: s.codecs.join(" · ") },
            { label: "Spatial audio", value: yesNo(s.spatialAudio) },
            { label: "Head tracking", value: yesNo(s.headTracking) },
          ],
        },
        {
          title: "Noise control",
          rows: [
            { label: "Cancellation", value: s.anc },
            { label: "Transparency mode", value: yesNo(s.transparencyMode) },
            { label: "Microphones", value: s.micCount > 0 ? `${s.micCount}` : "None" },
            { label: "Call noise reduction", value: yesNo(s.envNoiseCancelling) },
          ],
        },
        {
          title: "Battery",
          rows:
            s.connection === "Wired"
              ? [{ label: "Power", value: "Passive — no battery" }]
              : [
                  { label: "Playback", value: `${s.batteryHours} hours (ANC on)` },
                  ...(s.caseHours > 0
                    ? [{ label: "Case reserve", value: `${s.caseHours} hours` }]
                    : []),
                  { label: "Quick charge", value: s.quickCharge },
                  { label: "Wireless charging", value: yesNo(s.wirelessCharging) },
                ],
        },
        {
          title: "Fit & connectivity",
          rows: [
            { label: "Weight", value: `${s.weight} g` },
            { label: "Clamping force", value: `${s.clampForce} N` },
            { label: "Foldable", value: yesNo(s.foldable) },
            { label: "Water resistance", value: s.waterResistance },
            { label: "Bluetooth", value: s.bluetooth },
            { label: "Multipoint", value: yesNo(s.multipoint) },
            { label: "Companion app EQ", value: yesNo(s.eqApp) },
            { label: "Colours", value: s.colors.join(" · ") },
            { label: "Warranty", value: s.warranty },
          ],
        },
      ];
    }
  }
}

export function ProductSpecs({ product, className }: { product: Product; className?: string }) {
  return (
    <div className={cn("grid gap-5 md:grid-cols-2", className)}>
      {specGroups(product).map((group) => (
        <section key={group.title} className="card-surface p-5">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            {group.title}
          </h3>
          <dl className="mt-4 divide-y divide-ink-900/8 dark:divide-white/10">
            {group.rows.map((row) => (
              <div key={row.label} className="grid grid-cols-5 gap-3 py-2.5">
                <dt className="col-span-2 text-sm text-ink-500 dark:text-ink-400">{row.label}</dt>
                <dd className="col-span-3 text-sm font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <section className="card-surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Pricing
        </h3>
        <dl className="mt-4 divide-y divide-ink-900/8 dark:divide-white/10">
          <div className="grid grid-cols-5 gap-3 py-2.5">
            <dt className="col-span-2 text-sm text-ink-500 dark:text-ink-400">Street price</dt>
            <dd className="col-span-3 text-sm font-medium">{formatPrice(product.price)}</dd>
          </div>
          <div className="grid grid-cols-5 gap-3 py-2.5">
            <dt className="col-span-2 text-sm text-ink-500 dark:text-ink-400">List price</dt>
            <dd className="col-span-3 text-sm font-medium">{formatPrice(product.mrp)}</dd>
          </div>
          <div className="grid grid-cols-5 gap-3 py-2.5">
            <dt className="col-span-2 text-sm text-ink-500 dark:text-ink-400">Released</dt>
            <dd className="col-span-3 text-sm font-medium">{product.releaseYear}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
