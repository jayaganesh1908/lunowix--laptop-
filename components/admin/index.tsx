"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
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
import {
  Cpu,
  Gamepad2,
  Laptop,
  Laptop as LaptopIcon,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Rating } from "@/components/common/Display";
import { games, softwareCatalog, demoUsers, totalUsers } from "@/lib/data";
import { allReviews, budgetBands, laptops, laptopsInBand, trendingLaptops } from "@/lib/data/laptops";
import { useTheme, type ThemeMode } from "@/lib/hooks";
import {
  cn,
  compatibilityTone,
  fadeUp,
  formatCompact,
  formatDate,
  formatNumber,
  formatPrice,
  shortCpu,
  shortGpu,
  staggerFast,
} from "@/lib/utils";

export const ADMIN_SECTIONS = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "laptops", label: "Laptops", Icon: Laptop },
  { id: "users", label: "Users", Icon: Users },
  { id: "reviews", label: "Reviews", Icon: MessageSquare },
  { id: "games", label: "Games", Icon: Gamepad2 },
  { id: "software", label: "Software", Icon: Cpu },
  { id: "settings", label: "Settings", Icon: Settings },
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["id"];

export function Sidebar({
  active,
  onChange,
  className,
}: {
  active: AdminSection;
  onChange: (section: AdminSection) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Admin sections"
      className={cn("card-surface p-3", className)}
    >
      <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        Admin
      </p>
      <ul className="space-y-1">
        {ADMIN_SECTIONS.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                    : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/5",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export interface DashboardCardProps {
  label: string;
  value: string;
  hint?: string;
  /** Percentage change against the previous period. */
  delta?: number;
  icon: React.ReactNode;
  className?: string;
}

export function DashboardCard({
  label,
  value,
  hint,
  delta,
  icon,
  className,
}: DashboardCardProps) {
  const positive = (delta ?? 0) >= 0;
  const Trend = positive ? TrendingUp : TrendingDown;

  return (
    <motion.div variants={fadeUp} className={cn("card-surface p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
          {icon}
        </div>
        {delta !== undefined ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
              positive
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
            )}
          >
            <Trend className="size-3" aria-hidden />
            {positive ? "+" : ""}
            {delta}%
          </span>
        ) : null}
      </div>

      <p className="mt-4 font-mono text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-medium text-ink-600 dark:text-ink-300">{label}</p>
      {hint ? (
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{hint}</p>
      ) : null}
    </motion.div>
  );
}

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
    <section className={cn("card-surface p-5", className)}>
      <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{description}</p>
      <div className="mt-5 h-64 w-full">{children}</div>
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

const tableWrap = "card-surface overflow-x-auto";
const th =
  "whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400";
const td = "whitespace-nowrap px-4 py-3 text-sm";

export function AdminDashboard() {
  const [section, setSection] = useState<AdminSection>("dashboard");
  const { mode, setMode } = useTheme();

  const totalReviews = laptops.reduce((sum, laptop) => sum + laptop.reviews, 0);
  const averageRating =
    laptops.reduce((sum, laptop) => sum + laptop.rating, 0) / laptops.length;

  /** Mean estimated fps for each game across the whole catalogue. */
  const gameStats = useMemo(
    () =>
      games.map((game) => {
        const benchmarks = laptops
          .map((laptop) => laptop.games.find((entry) => entry.id === game.id))
          .filter((entry) => entry !== undefined);
        const average =
          benchmarks.reduce((sum, entry) => sum + entry.fps, 0) / benchmarks.length;
        const playable = benchmarks.filter((entry) => entry.fps >= 60).length;
        return { game, average: Math.round(average), playable };
      }),
    [],
  );

  /** How many machines land in each compatibility bucket, per application. */
  const softwareStats = useMemo(
    () =>
      softwareCatalog.map((software) => {
        const counts = { smooth: 0, fine: 0, limited: 0, no: 0 };
        for (const laptop of laptops) {
          const status = laptop.software[software.name];
          if (status === "Runs Smoothly") counts.smooth += 1;
          else if (status === "Runs Fine") counts.fine += 1;
          else if (status === "Limited") counts.limited += 1;
          else counts.no += 1;
        }
        return { software, counts };
      }),
    [],
  );

  const heading = ADMIN_SECTIONS.find((entry) => entry.id === section)?.label ?? "";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="lg:w-56 lg:shrink-0">
        <div className="lg:sticky lg:top-24">
          <Sidebar active={section} onChange={setSection} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-bold tracking-tight">{heading}</h2>

        {section === "dashboard" ? (
          <div className="mt-5 space-y-6">
            <motion.div
              variants={staggerFast}
              initial="hidden"
              animate="visible"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <DashboardCard
                label="Total laptops"
                value={formatNumber(laptops.length)}
                hint="Across 7 brands"
                delta={8}
                icon={<LaptopIcon className="size-5" aria-hidden />}
              />
              <DashboardCard
                label="Total users"
                value={formatCompact(totalUsers)}
                hint={`${demoUsers.filter((user) => user.active).length} active this week`}
                delta={12}
                icon={<Users className="size-5" aria-hidden />}
              />
              <DashboardCard
                label="Total reviews"
                value={formatCompact(totalReviews)}
                hint={`Average rating ${averageRating.toFixed(2)}`}
                delta={5}
                icon={<MessageSquare className="size-5" aria-hidden />}
              />
              <DashboardCard
                label="Trending laptop"
                value={formatCompact(laptops.reduce((max, l) => Math.max(max, l.views), 0))}
                hint="Views on the most-opened page"
                delta={-3}
                icon={<TrendingUp className="size-5" aria-hidden />}
              />
            </motion.div>

            <div className="grid gap-5 xl:grid-cols-2">
              <BrandDistributionChart />
              <PriceDistributionChart />
              <GamingTrendChart />
              <TopLaptopsList />
            </div>
          </div>
        ) : null}

        {section === "laptops" ? (
          <div className={cn(tableWrap, "mt-5")}>
            <table className="w-full min-w-[52rem]">
              <caption className="sr-only">All laptops in the catalogue</caption>
              <thead className="border-b border-ink-900/5 dark:border-white/10">
                <tr>
                  <th scope="col" className={th}>Laptop</th>
                  <th scope="col" className={th}>Brand</th>
                  <th scope="col" className={th}>Silicon</th>
                  <th scope="col" className={th}>Price</th>
                  <th scope="col" className={th}>Overall</th>
                  <th scope="col" className={th}>Views</th>
                </tr>
              </thead>
              <tbody>
                {laptops.map((laptop) => (
                  <tr key={laptop.id} className="border-b border-ink-900/5 last:border-b-0 dark:border-white/10">
                    <td className={td}>
                      <Link href={`/laptops/${laptop.id}`} className="flex items-center gap-3 hover:text-brand-600 dark:hover:text-brand-400">
                        <Image src={laptop.image} alt="" width={56} height={42} className="h-9 w-12 rounded-lg object-cover" />
                        <span className="font-semibold">{laptop.name}</span>
                      </Link>
                    </td>
                    <td className={td}>{laptop.brand}</td>
                    <td className={cn(td, "text-ink-600 dark:text-ink-300")}>
                      {shortCpu(laptop.specs.processor)} · {shortGpu(laptop.specs.gpu)}
                    </td>
                    <td className={cn(td, "font-mono tabular-nums")}>{formatPrice(laptop.price)}</td>
                    <td className={td}>
                      <Badge tone={laptop.performance.overall >= 70 ? "success" : "neutral"}>
                        {laptop.performance.overall}
                      </Badge>
                    </td>
                    <td className={cn(td, "font-mono tabular-nums text-ink-500 dark:text-ink-400")}>
                      {formatCompact(laptop.views)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {section === "users" ? (
          <div className={cn(tableWrap, "mt-5")}>
            <table className="w-full min-w-[48rem]">
              <caption className="sr-only">Registered users</caption>
              <thead className="border-b border-ink-900/5 dark:border-white/10">
                <tr>
                  <th scope="col" className={th}>User</th>
                  <th scope="col" className={th}>Role</th>
                  <th scope="col" className={th}>Joined</th>
                  <th scope="col" className={th}>Wishlist</th>
                  <th scope="col" className={th}>Comparisons</th>
                  <th scope="col" className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {demoUsers.map((user) => (
                  <tr key={user.id} className="border-b border-ink-900/5 last:border-b-0 dark:border-white/10">
                    <td className={td}>
                      <span className="block font-semibold">{user.name}</span>
                      <span className="block text-xs text-ink-500 dark:text-ink-400">{user.email}</span>
                    </td>
                    <td className={td}>
                      <Badge tone={user.role === "Admin" ? "brand" : user.role === "Editor" ? "info" : "neutral"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className={cn(td, "text-ink-600 dark:text-ink-300")}>{formatDate(user.joinedAt)}</td>
                    <td className={cn(td, "font-mono tabular-nums")}>{user.wishlistCount}</td>
                    <td className={cn(td, "font-mono tabular-nums")}>{user.comparisons}</td>
                    <td className={td}>
                      <Badge tone={user.active ? "success" : "neutral"}>
                        {user.active ? "Active" : "Dormant"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {section === "reviews" ? (
          <div className="mt-5 space-y-3">
            {allReviews.slice(0, 18).map((review) => (
              <article key={review.id} className="card-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{review.author}</p>
                    <Link
                      href={`/laptops/${review.laptopId}`}
                      className="text-xs text-brand-700 hover:underline dark:text-brand-400"
                    >
                      {review.laptopName}
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <Rating value={review.rating} />
                    <span className="text-xs text-ink-500 dark:text-ink-400">
                      {formatDate(review.date)}
                    </span>
                    <Badge tone={review.verified ? "success" : "neutral"}>
                      {review.verified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
                  <span className="font-semibold text-ink-900 dark:text-white">
                    {review.title}
                  </span>{" "}
                  — {review.comment}
                </p>
              </article>
            ))}
          </div>
        ) : null}

        {section === "games" ? (
          <div className={cn(tableWrap, "mt-5")}>
            <table className="w-full min-w-[44rem]">
              <caption className="sr-only">Game benchmark coverage</caption>
              <thead className="border-b border-ink-900/5 dark:border-white/10">
                <tr>
                  <th scope="col" className={th}>Game</th>
                  <th scope="col" className={th}>Genre</th>
                  <th scope="col" className={th}>GPU demand</th>
                  <th scope="col" className={th}>Avg fps</th>
                  <th scope="col" className={th}>Laptops above 60fps</th>
                </tr>
              </thead>
              <tbody>
                {gameStats.map(({ game, average, playable }) => (
                  <tr key={game.id} className="border-b border-ink-900/5 last:border-b-0 dark:border-white/10">
                    <td className={td}>
                      <span className="flex items-center gap-2 font-semibold">
                        <span aria-hidden>{game.icon}</span>
                        {game.name}
                      </span>
                    </td>
                    <td className={cn(td, "text-ink-600 dark:text-ink-300")}>{game.genre}</td>
                    <td className={cn(td, "font-mono tabular-nums")}>{game.demand}</td>
                    <td className={cn(td, "font-mono tabular-nums")}>{average}</td>
                    <td className={td}>
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                            style={{ width: `${(playable / laptops.length) * 100}%` }}
                          />
                        </span>
                        <span className="font-mono text-xs tabular-nums">
                          {playable}/{laptops.length}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {section === "software" ? (
          <div className={cn(tableWrap, "mt-5")}>
            <table className="w-full min-w-[46rem]">
              <caption className="sr-only">Software compatibility coverage</caption>
              <thead className="border-b border-ink-900/5 dark:border-white/10">
                <tr>
                  <th scope="col" className={th}>Application</th>
                  <th scope="col" className={th}>Category</th>
                  <th scope="col" className={th}>Requirement (CPU / GPU / RAM)</th>
                  <th scope="col" className={th}>Distribution across catalogue</th>
                </tr>
              </thead>
              <tbody>
                {softwareStats.map(({ software, counts }) => (
                  <tr key={software.id} className="border-b border-ink-900/5 last:border-b-0 dark:border-white/10">
                    <td className={td}>
                      <span className="flex items-center gap-2 font-semibold">
                        <span aria-hidden>{software.icon}</span>
                        {software.name}
                      </span>
                    </td>
                    <td className={cn(td, "text-ink-600 dark:text-ink-300")}>
                      {software.category}
                    </td>
                    <td className={cn(td, "font-mono text-xs tabular-nums text-ink-600 dark:text-ink-300")}>
                      {software.requirement.cpu} / {software.requirement.gpu} /{" "}
                      {software.requirement.ram}GB
                    </td>
                    <td className={td}>
                      <span className="flex flex-wrap gap-1.5">
                        <Badge tone={compatibilityTone("Runs Smoothly")}>{counts.smooth}</Badge>
                        <Badge tone={compatibilityTone("Runs Fine")}>{counts.fine}</Badge>
                        <Badge tone={compatibilityTone("Limited")}>{counts.limited}</Badge>
                        <Badge tone={compatibilityTone("Not Recommended")}>{counts.no}</Badge>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {section === "settings" ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="card-surface p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest">Appearance</h3>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                Applies immediately and is stored in this browser.
              </p>
              <div className="mt-4 flex gap-2">
                {(["light", "dark", "system"] as ThemeMode[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMode(option)}
                    aria-pressed={mode === option}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition",
                      mode === option
                        ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                        : "border-ink-200 text-ink-600 hover:border-brand-400 dark:border-white/15 dark:text-ink-300",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </section>

            <section className="card-surface p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest">Catalogue</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  { label: "Data source", value: "Static TypeScript (lib/data)" },
                  { label: "Currency", value: "INR (₹)" },
                  { label: "Market", value: "India" },
                  { label: "Benchmark model", value: "Deterministic, v1" },
                  { label: "Records", value: `${laptops.length} laptops · ${games.length} games · ${softwareCatalog.length} apps` },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-ink-900/5 pb-3 last:border-b-0 last:pb-0 dark:border-white/10">
                    <dt className="text-ink-500 dark:text-ink-400">{row.label}</dt>
                    <dd className="text-right font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="card-surface p-6 lg:col-span-2">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                <Gamepad2 className="size-4" aria-hidden />
                Integration checklist
              </h3>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                What a production deployment would swap in next.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink-600 dark:text-ink-300">
                {[
                  "Replace lib/data with API calls (the types stay identical)",
                  "Move wishlist and compare state behind an authenticated account",
                  "Feed measured benchmark runs into the game model",
                  "Wire the affiliate URLs on each laptop record to a real merchant",
                  "Add a price-history table and chart it alongside the trend graph",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Star className="mt-0.5 size-3.5 shrink-0 text-brand-500" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
