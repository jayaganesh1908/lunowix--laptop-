"use client";

import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Rating } from "@/components/common/Rating";
import { buttonStyles } from "@/components/common/buttonStyles";
import { productHref } from "@/lib/types";
import type { Headphone, Laptop, Phone, Product } from "@/lib/types";
import {
  formatBattery,
  formatPrice,
  formatStorage,
  formatWeight,
} from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

/*
 * One table, three row sets.
 *
 * The rows are what make a comparison worth reading, and they are specific to
 * the kind of thing being compared: a phone has no GPU VRAM, a laptop has no
 * optical zoom, and neither has a clamping force. Rather than a lowest common
 * denominator of price-and-rating, each category brings its own rows and the
 * shared markup — grouping, winner highlighting, sticky labels — is written
 * once and typed generically over the product.
 *
 * `useCompare` guarantees both entries share a category, so the narrowing
 * below always resolves.
 */

type Direction = "higher" | "lower" | "none";

interface Row<T> {
  label: string;
  group: string;
  direction: Direction;
  /** Numeric value used to decide the winner. */
  score: (product: T) => number;
  render: (product: T) => React.ReactNode;
}

const LAPTOP_ROWS: Row<Laptop>[] = [
  {
    label: "Price",
    group: "Value",
    direction: "lower",
    score: (l) => l.price,
    render: (l) => (
      <span className="font-mono text-base font-bold tabular-nums">
        {formatPrice(l.price)}
      </span>
    ),
  },
  {
    label: "Rating",
    group: "Value",
    direction: "higher",
    score: (l) => l.rating,
    render: (l) => <Rating value={l.rating} count={l.reviews} />,
  },
  {
    label: "Processor",
    group: "Core hardware",
    direction: "higher",
    score: (l) => l.performance.coding,
    render: (l) => (
      <>
        <span className="block font-medium">{l.specs.processor}</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {l.specs.cores} cores
        </span>
      </>
    ),
  },
  {
    label: "Graphics",
    group: "Core hardware",
    direction: "higher",
    score: (l) => l.performance.gaming,
    render: (l) => (
      <>
        <span className="block font-medium">{l.specs.gpu}</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {l.specs.gpuVram ? `${l.specs.gpuVram} GB VRAM` : "Integrated"}
        </span>
      </>
    ),
  },
  {
    label: "Memory",
    group: "Core hardware",
    direction: "higher",
    score: (l) => l.specs.ram,
    render: (l) => (
      <>
        <span className="block font-medium">{l.specs.ram} GB</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">{l.specs.ramType}</span>
      </>
    ),
  },
  {
    label: "Storage",
    group: "Core hardware",
    direction: "higher",
    score: (l) => l.specs.storage,
    render: (l) => (
      <>
        <span className="block font-medium">{formatStorage(l.specs.storage)}</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {l.specs.storageType}
        </span>
      </>
    ),
  },
  {
    label: "Display",
    group: "Chassis",
    direction: "higher",
    score: (l) => l.performance.display,
    render: (l) => (
      <>
        <span className="block font-medium">
          {l.specs.display.size}&quot; {l.specs.display.panel}
        </span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {l.specs.display.resolution} · {l.specs.display.refreshRate}Hz
        </span>
      </>
    ),
  },
  {
    label: "Battery",
    group: "Chassis",
    direction: "higher",
    score: (l) => l.specs.battery,
    render: (l) => formatBattery(l.specs.battery),
  },
  {
    label: "Weight",
    group: "Chassis",
    direction: "lower",
    score: (l) => l.specs.weight,
    render: (l) => formatWeight(l.specs.weight),
  },
  {
    label: "Ports",
    group: "Chassis",
    direction: "higher",
    score: (l) => l.specs.ports.length,
    render: (l) => (
      <ul className="space-y-1 text-xs">
        {l.specs.ports.map((port) => (
          <li key={port}>{port}</li>
        ))}
      </ul>
    ),
  },
  {
    label: "Coding",
    group: "Performance",
    direction: "higher",
    score: (l) => l.performance.coding,
    render: (l) => <ScoreCell value={l.performance.coding} />,
  },
  {
    label: "Gaming",
    group: "Performance",
    direction: "higher",
    score: (l) => l.performance.gaming,
    render: (l) => <ScoreCell value={l.performance.gaming} />,
  },
  {
    label: "Editing",
    group: "Performance",
    direction: "higher",
    score: (l) => l.performance.editing,
    render: (l) => <ScoreCell value={l.performance.editing} />,
  },
  {
    label: "AI development",
    group: "Performance",
    direction: "higher",
    score: (l) => l.performance.aiDevelopment,
    render: (l) => <ScoreCell value={l.performance.aiDevelopment} />,
  },
  {
    label: "Overall",
    group: "Performance",
    direction: "higher",
    score: (l) => l.performance.overall,
    render: (l) => <ScoreCell value={l.performance.overall} />,
  },
  {
    label: "Warranty",
    group: "Ownership",
    direction: "none",
    score: () => 0,
    render: (l) => l.specs.warranty,
  },
];

const PHONE_ROWS: Row<Phone>[] = [
  {
    label: "Price",
    group: "Value",
    direction: "lower",
    score: (p) => p.price,
    render: (p) => (
      <span className="font-mono text-base font-bold tabular-nums">
        {formatPrice(p.price)}
      </span>
    ),
  },
  {
    label: "Rating",
    group: "Value",
    direction: "higher",
    score: (p) => p.rating,
    render: (p) => <Rating value={p.rating} count={p.reviews} />,
  },
  {
    label: "Chipset",
    group: "Core hardware",
    direction: "higher",
    score: (p) => p.performance.performance,
    render: (p) => (
      <>
        <span className="block font-medium">{p.specs.chipset}</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {p.specs.cores} cores · {p.specs.process}nm
        </span>
      </>
    ),
  },
  {
    label: "Memory",
    group: "Core hardware",
    direction: "higher",
    score: (p) => p.specs.ram,
    render: (p) => <span className="font-medium">{p.specs.ram} GB</span>,
  },
  {
    label: "Storage",
    group: "Core hardware",
    direction: "higher",
    score: (p) => p.specs.storage,
    render: (p) => (
      <>
        <span className="block font-medium">{formatStorage(p.specs.storage)}</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">{p.specs.storageType}</span>
      </>
    ),
  },
  {
    label: "Display",
    group: "Screen",
    direction: "higher",
    score: (p) => p.performance.display,
    render: (p) => (
      <>
        <span className="block font-medium">
          {p.specs.display.size}&quot; {p.specs.display.panel}
        </span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {p.specs.display.resolution} · {p.specs.display.refreshRate}Hz
        </span>
      </>
    ),
  },
  {
    label: "Brightness",
    group: "Screen",
    direction: "higher",
    score: (p) => p.specs.display.brightness,
    render: (p) => `${p.specs.display.brightness} nits`,
  },
  {
    label: "Main camera",
    group: "Camera",
    direction: "higher",
    score: (p) => p.specs.camera.main.mp,
    render: (p) => (
      <>
        <span className="block font-medium">{p.specs.camera.main.mp} MP</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          f/{p.specs.camera.main.aperture}
          {p.specs.camera.main.ois ? " · OIS" : ""}
        </span>
      </>
    ),
  },
  {
    label: "Optical zoom",
    group: "Camera",
    direction: "higher",
    score: (p) => p.specs.camera.opticalZoom,
    render: (p) =>
      p.specs.camera.opticalZoom > 1 ? `${p.specs.camera.opticalZoom}×` : "None",
  },
  {
    label: "Video",
    group: "Camera",
    direction: "none",
    score: () => 0,
    render: (p) => p.specs.camera.maxVideo,
  },
  {
    label: "Battery",
    group: "Endurance",
    direction: "higher",
    score: (p) => p.specs.battery,
    render: (p) => `${p.specs.battery} mAh`,
  },
  {
    label: "Charging",
    group: "Endurance",
    direction: "higher",
    score: (p) => p.specs.charging,
    render: (p) => (
      <>
        <span className="block font-medium">{p.specs.charging}W wired</span>
        {p.specs.wirelessCharging ? (
          <span className="text-xs text-ink-500 dark:text-ink-400">
            {p.specs.wirelessCharging}W wireless
          </span>
        ) : null}
      </>
    ),
  },
  {
    label: "Weight",
    group: "Endurance",
    direction: "lower",
    score: (p) => p.specs.weight,
    render: (p) => `${p.specs.weight} g`,
  },
  {
    label: "Performance",
    group: "Scores",
    direction: "higher",
    score: (p) => p.performance.performance,
    render: (p) => <ScoreCell value={p.performance.performance} />,
  },
  {
    label: "Camera",
    group: "Scores",
    direction: "higher",
    score: (p) => p.performance.camera,
    render: (p) => <ScoreCell value={p.performance.camera} />,
  },
  {
    label: "Battery life",
    group: "Scores",
    direction: "higher",
    score: (p) => p.performance.battery,
    render: (p) => <ScoreCell value={p.performance.battery} />,
  },
  {
    label: "Gaming",
    group: "Scores",
    direction: "higher",
    score: (p) => p.performance.gaming,
    render: (p) => <ScoreCell value={p.performance.gaming} />,
  },
  {
    label: "Overall",
    group: "Scores",
    direction: "higher",
    score: (p) => p.performance.overall,
    render: (p) => <ScoreCell value={p.performance.overall} />,
  },
];

const HEADPHONE_ROWS: Row<Headphone>[] = [
  {
    label: "Price",
    group: "Value",
    direction: "lower",
    score: (h) => h.price,
    render: (h) => (
      <span className="font-mono text-base font-bold tabular-nums">
        {formatPrice(h.price)}
      </span>
    ),
  },
  {
    label: "Rating",
    group: "Value",
    direction: "higher",
    score: (h) => h.rating,
    render: (h) => <Rating value={h.rating} count={h.reviews} />,
  },
  {
    label: "Form",
    group: "Fit",
    direction: "none",
    score: () => 0,
    render: (h) => (
      <>
        <span className="block font-medium">{h.specs.form}</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">{h.specs.connection}</span>
      </>
    ),
  },
  {
    label: "Weight",
    group: "Fit",
    direction: "lower",
    score: (h) => h.specs.weight,
    render: (h) => `${h.specs.weight} g`,
  },
  {
    label: "Clamping force",
    group: "Fit",
    direction: "lower",
    score: (h) => h.specs.clampForce,
    render: (h) => `${h.specs.clampForce} N`,
  },
  {
    label: "Driver",
    group: "Sound",
    direction: "higher",
    score: (h) => h.specs.driver.size,
    render: (h) => (
      <>
        <span className="block font-medium">
          {h.specs.driver.size}mm {h.specs.driver.type}
        </span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {h.specs.driver.frequencyResponse}
        </span>
      </>
    ),
  },
  {
    label: "Codecs",
    group: "Sound",
    direction: "higher",
    score: (h) => h.specs.codecs.length,
    render: (h) => (
      <ul className="space-y-1 text-xs">
        {h.specs.codecs.map((codec) => (
          <li key={codec}>{codec}</li>
        ))}
      </ul>
    ),
  },
  {
    label: "Noise cancelling",
    group: "Sound",
    direction: "higher",
    score: (h) => h.performance.noiseCancelling,
    render: (h) => (
      <>
        <span className="block font-medium">{h.specs.anc}</span>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {h.specs.transparencyMode ? "Transparency mode" : "No transparency"}
        </span>
      </>
    ),
  },
  {
    label: "Playback",
    group: "Endurance",
    direction: "higher",
    score: (h) => h.specs.batteryHours + h.specs.caseHours,
    render: (h) => (
      <>
        <span className="block font-medium">{h.specs.batteryHours} hrs</span>
        {h.specs.caseHours ? (
          <span className="text-xs text-ink-500 dark:text-ink-400">
            +{h.specs.caseHours} hrs in the case
          </span>
        ) : null}
      </>
    ),
  },
  {
    label: "Quick charge",
    group: "Endurance",
    direction: "none",
    score: () => 0,
    render: (h) => h.specs.quickCharge,
  },
  {
    label: "Multipoint",
    group: "Connectivity",
    direction: "higher",
    score: (h) => (h.specs.multipoint ? 1 : 0),
    render: (h) => (h.specs.multipoint ? "Yes" : "No"),
  },
  {
    label: "Bluetooth",
    group: "Connectivity",
    direction: "none",
    score: () => 0,
    render: (h) => h.specs.bluetooth,
  },
  {
    label: "Water resistance",
    group: "Connectivity",
    direction: "none",
    score: () => 0,
    render: (h) => h.specs.waterResistance,
  },
  {
    label: "Sound",
    group: "Scores",
    direction: "higher",
    score: (h) => h.performance.sound,
    render: (h) => <ScoreCell value={h.performance.sound} />,
  },
  {
    label: "ANC",
    group: "Scores",
    direction: "higher",
    score: (h) => h.performance.noiseCancelling,
    render: (h) => <ScoreCell value={h.performance.noiseCancelling} />,
  },
  {
    label: "Comfort",
    group: "Scores",
    direction: "higher",
    score: (h) => h.performance.comfort,
    render: (h) => <ScoreCell value={h.performance.comfort} />,
  },
  {
    label: "Microphone",
    group: "Scores",
    direction: "higher",
    score: (h) => h.performance.mic,
    render: (h) => <ScoreCell value={h.performance.mic} />,
  },
  {
    label: "Overall",
    group: "Scores",
    direction: "higher",
    score: (h) => h.performance.overall,
    render: (h) => <ScoreCell value={h.performance.overall} />,
  },
];

function ScoreCell({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
          style={{ width: `${value}%` }}
        />
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
    </span>
  );
}

/** Returns the index of the winning column, or -1 when it is a tie. */
function winnerIndex<T>(row: Row<T>, entries: T[]) {
  if (row.direction === "none" || entries.length < 2) return -1;
  const scores = entries.map(row.score);
  const best =
    row.direction === "higher" ? Math.max(...scores) : Math.min(...scores);
  const winners = scores.filter((score) => score === best);
  if (winners.length > 1) return -1;
  return scores.indexOf(best);
}

/**
 * Narrows a pair to its category's rows.
 *
 * The pair is checked rather than assumed: `useCompare` keeps a tray to one
 * category, but this component is exported and a caller could hand it anything.
 * A mixed pair falls back to nothing rather than rendering a table of blanks.
 */
export function ComparisonTable({
  entries,
  className,
}: {
  entries: Product[];
  className?: string;
}) {
  const [first, second] = entries;
  if (!first || !second || first.category !== second.category) return null;

  if (first.category === "laptop") {
    return (
      <Table
        rows={LAPTOP_ROWS}
        entries={entries as Laptop[]}
        className={className}
      />
    );
  }
  if (first.category === "phone") {
    return (
      <Table rows={PHONE_ROWS} entries={entries as Phone[]} className={className} />
    );
  }
  return (
    <Table
      rows={HEADPHONE_ROWS}
      entries={entries as Headphone[]}
      className={className}
    />
  );
}

function Table<T extends Product>({
  rows,
  entries,
  className,
}: {
  rows: Row<T>[];
  entries: T[];
  className?: string;
}) {
  const groups = Array.from(new Set(rows.map((row) => row.group)));

  return (
    <div className={cn("card-surface overflow-x-auto", className)}>
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <caption className="sr-only">
          Side-by-side comparison of {entries.map((entry) => entry.name).join(" and ")}
        </caption>

        <thead>
          <tr className="border-b border-ink-900/5 dark:border-white/10">
            <th
              scope="col"
              className="sticky left-0 z-10 w-40 bg-white p-4 text-left align-bottom text-xs font-bold uppercase tracking-widest text-ink-500 sm:w-52 dark:bg-ink-900 dark:text-ink-400"
            >
              Specification
            </th>
            {entries.map((product) => (
              <th key={product.id} scope="col" className="p-4 text-left align-bottom">
                <Image
                  src={product.image}
                  alt=""
                  width={160}
                  height={120}
                  className="mb-3 h-24 w-32 rounded-xl object-cover"
                />
                <span className="block text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  {product.brand}
                </span>
                {/* `productHref`, not a hardcoded /laptops/ prefix — the link
                    has to land on the right category's detail route. */}
                <Link
                  href={productHref(product)}
                  className="mt-1 block text-base font-semibold tracking-tight hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {product.name}
                </Link>
                <Link
                  href={productHref(product)}
                  className={buttonStyles({ variant: "outline", size: "sm", className: "mt-3" })}
                >
                  View details
                </Link>
              </th>
            ))}
          </tr>
        </thead>

        {groups.map((group) => (
          <tbody key={group}>
            <tr>
              <th
                colSpan={entries.length + 1}
                scope="colgroup"
                className="bg-ink-50 px-4 py-2 text-left text-xs font-bold uppercase tracking-widest text-ink-500 dark:bg-ink-950/40 dark:text-ink-400"
              >
                {group}
              </th>
            </tr>
            {rows.filter((row) => row.group === group).map((row) => {
              const winner = winnerIndex(row, entries);
              return (
                <tr
                  key={row.label}
                  className="border-b border-ink-900/5 last:border-b-0 dark:border-white/10"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white p-4 text-left align-top font-medium text-ink-500 dark:bg-ink-900 dark:text-ink-400"
                  >
                    {row.label}
                  </th>
                  {entries.map((product, index) => (
                    <td
                      key={product.id}
                      className={cn(
                        "p-4 align-top",
                        index === winner &&
                          "bg-brand-500/[0.08] ring-1 ring-inset ring-brand-500/25",
                      )}
                    >
                      <span className="block">{row.render(product)}</span>
                      {index === winner ? (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                          <Check className="size-3" aria-hidden />
                          Better
                        </span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
