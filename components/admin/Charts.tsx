"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/lib/hooks/useTheme";
import { budgetBands, laptops, laptopsInBand, trendingLaptops } from "@/lib/data/laptops";
import { formatCompact, formatPrice } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

const BRAND = "#ff6b00";
const BRAND_DEEP = "#b84a00";

function useChartColors() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    grid: dark ? "rgba(255,255,255,0.08)" : "rgba(11,11,11,0.07)",
    axis: dark ? "#8b8b95" : "#6c6c76",
    tooltipBg: dark ? "#1a1a1a" : "#ffffff",
    tooltipBorder: dark ? "rgba(255,255,255,0.12)" : "rgba(11,11,11,0.08)",
    tooltipText: dark ? "#f7f7f8" : "#121214",
  };
}

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    /*
     * `min-w-0` on the card, and on the box the chart measures.
     *
     * Recharts' `ResponsiveContainer` reads its parent's width and renders to
     * it. A grid item defaults to `min-width: auto`, which refuses to shrink
     * below its contents — so the container measured 0, the chart fell back to
     * a stale width, and the widest of the three pushed the whole admin page
     * sideways: 20px of horizontal scroll at 320 and 96px at 1024, on a page
     * with no other layout problem. `min-w-0` lets the track shrink, which is
     * the only thing a percentage-width chart needs to behave.
     */
    <section className={cn("card-surface min-w-0 p-5", className)}>
      <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{description}</p>
      {/*
        `overflow-hidden` is load-bearing, not tidiness.

        Recharts writes its measured width back onto its own wrapper as an
        inline `width: 272px`. That inline width then counts toward the card's
        min-content, which inflates the grid track, which keeps the card wide —
        so the chart measures wide again and never shrinks back. Clipping here
        stops the child's width from feeding the parent's, the card sizes to the
        track, and the resize observer re-measures into the real space.
      */}
      <div className="mt-5 h-64 w-full min-w-0 overflow-hidden">{children}</div>
    </section>
  );
}

/* --------------------------- Laptops per brand ---------------------------- */

const brandData = Array.from(
  laptops.reduce((map, laptop) => {
    map.set(laptop.brand, (map.get(laptop.brand) ?? 0) + 1);
    return map;
  }, new Map<string, number>()),
)
  .map(([brand, count]) => ({ brand, count }))
  .sort((a, b) => b.count - a.count);

export function BrandDistributionChart() {
  const colors = useChartColors();

  return (
    <ChartCard
      title="Laptops by brand"
      description="Catalogue coverage across the seven brands we track."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={brandData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="brand"
            tick={{ fill: colors.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: colors.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,107,0,0.08)" }}
            contentStyle={{
              background: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: 12,
              color: colors.tooltipText,
              fontSize: 12,
            }}
            formatter={(value) => [`${value} laptops`, "Count"]}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {brandData.map((entry, index) => (
              <Cell key={entry.brand} fill={index === 0 ? BRAND : BRAND_DEEP} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* -------------------------- Price distribution ---------------------------- */

const priceData = budgetBands.map((band) => ({
  band: band.shortLabel.replace("Above ", ">").replace("Under ", "<"),
  count: laptopsInBand(band).length,
}));

export function PriceDistributionChart() {
  const colors = useChartColors();

  return (
    <ChartCard
      title="Price distribution"
      description="How the catalogue spreads across the six budget bands."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={priceData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="band"
            tick={{ fill: colors.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: colors.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,107,0,0.08)" }}
            contentStyle={{
              background: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: 12,
              color: colors.tooltipText,
              fontSize: 12,
            }}
            formatter={(value) => [`${value} laptops`, "In band"]}
          />
          <Bar dataKey="count" fill={BRAND} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ----------------------- Gaming performance by price ---------------------- */

/** Average gaming score inside each budget band — the price/performance curve. */
const gamingTrendData = budgetBands.map((band) => {
  const inBand = laptopsInBand(band);
  const average = (key: "gaming" | "coding") =>
    inBand.length
      ? Math.round(
          inBand.reduce((total, laptop) => total + laptop.performance[key], 0) /
            inBand.length,
        )
      : 0;

  return {
    band: band.shortLabel.replace("Above ", ">").replace("Under ", "<"),
    gaming: average("gaming"),
    coding: average("coding"),
  };
});

export function GamingTrendChart() {
  const colors = useChartColors();

  return (
    <ChartCard
      title="Performance vs budget"
      description="Average gaming and coding scores in each price band."
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={gamingTrendData}
          margin={{ top: 4, right: 8, bottom: 4, left: -20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="band"
            tick={{ fill: colors.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: colors.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              borderRadius: 12,
              color: colors.tooltipText,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="gaming"
            name="Gaming"
            stroke={BRAND}
            strokeWidth={2.5}
            dot={{ r: 4, fill: BRAND }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="coding"
            name="Coding"
            stroke={colors.axis}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ---------------------------- Top viewed list ----------------------------- */

export function TopLaptopsList({ className }: { className?: string }) {
  const max = Math.max(...trendingLaptops.map((laptop) => laptop.views));

  return (
    <section className={cn("card-surface p-5", className)}>
      <h3 className="text-sm font-bold uppercase tracking-widest">Top 5 by views</h3>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
        Most-opened detail pages across the catalogue.
      </p>

      <ol className="mt-5 space-y-3">
        {trendingLaptops.map((laptop, index) => (
          <li key={laptop.id} className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 font-mono text-xs font-bold text-brand-700 dark:text-brand-300"
            >
              {index + 1}
            </span>
            <Image
              src={laptop.image}
              alt=""
              width={56}
              height={42}
              className="h-10 w-14 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/laptops/${laptop.id}`}
                className="block truncate text-sm font-semibold hover:text-brand-600 dark:hover:text-brand-400"
              >
                {laptop.name}
              </Link>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                    style={{ width: `${(laptop.views / max) * 100}%` }}
                  />
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-ink-500 dark:text-ink-400">
                  {formatCompact(laptop.views)}
                </span>
              </div>
            </div>
            <span className="hidden shrink-0 font-mono text-xs tabular-nums text-ink-500 sm:block dark:text-ink-400">
              {formatPrice(laptop.price)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
