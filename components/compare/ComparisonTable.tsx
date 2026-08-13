"use client";

import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Rating } from "@/components/common/Rating";
import { buttonStyles } from "@/components/common/buttonStyles";
import type { Laptop } from "@/lib/types/laptop";
import {
  formatBattery,
  formatPrice,
  formatStorage,
  formatWeight,
} from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

type Direction = "higher" | "lower" | "none";

interface Row {
  label: string;
  group: string;
  direction: Direction;
  /** Numeric value used to decide the winner. */
  score: (laptop: Laptop) => number;
  render: (laptop: Laptop) => React.ReactNode;
}

const ROWS: Row[] = [
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
function winnerIndex(row: Row, entries: Laptop[]) {
  if (row.direction === "none" || entries.length < 2) return -1;
  const scores = entries.map(row.score);
  const best =
    row.direction === "higher" ? Math.max(...scores) : Math.min(...scores);
  const winners = scores.filter((score) => score === best);
  if (winners.length > 1) return -1;
  return scores.indexOf(best);
}

export function ComparisonTable({
  entries,
  className,
}: {
  entries: Laptop[];
  className?: string;
}) {
  const groups = Array.from(new Set(ROWS.map((row) => row.group)));

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
            {entries.map((laptop) => (
              <th key={laptop.id} scope="col" className="p-4 text-left align-bottom">
                <Image
                  src={laptop.image}
                  alt=""
                  width={160}
                  height={120}
                  className="mb-3 h-24 w-32 rounded-xl object-cover"
                />
                <span className="block text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  {laptop.brand}
                </span>
                <Link
                  href={`/laptops/${laptop.id}`}
                  className="mt-1 block text-base font-semibold tracking-tight hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {laptop.name}
                </Link>
                <Link
                  href={`/laptops/${laptop.id}`}
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
            {ROWS.filter((row) => row.group === group).map((row) => {
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
                  {entries.map((laptop, index) => (
                    <td
                      key={laptop.id}
                      className={cn(
                        "p-4 align-top",
                        index === winner &&
                          "bg-brand-500/[0.08] ring-1 ring-inset ring-brand-500/25",
                      )}
                    >
                      <span className="block">{row.render(laptop)}</span>
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
