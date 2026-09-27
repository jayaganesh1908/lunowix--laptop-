"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Gamepad2,
  Laptop as LaptopIcon,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  BrandDistributionChart,
  GamingTrendChart,
  PriceDistributionChart,
  TopLaptopsList,
} from "./Charts";
import { DashboardCard } from "./DashboardCard";
import { LiveStats } from "./LiveStats";
import { UserTable } from "./UserTable";
import { ADMIN_SECTIONS, Sidebar, type AdminSection } from "./Sidebar";
import { Badge } from "@/components/common/Badge";
import { Rating } from "@/components/common/Rating";
import { useTheme, type ThemeMode } from "@/lib/hooks/useTheme";
import { allReviews, laptops } from "@/lib/data/laptops";
import { games } from "@/lib/data/games";
import { allProducts } from "@/lib/data/products";
import { softwareCatalog } from "@/lib/data/software";
import {
  compatibilityTone,
  formatCompact,
  formatDate,
  formatNumber,
  formatPrice,
  shortCpu,
  shortGpu,
} from "@/lib/utils/formatters";
import { staggerFast } from "@/lib/utils/animations";
import { cn } from "@/lib/utils/cn";

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
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <DashboardCard
                label="Total laptops"
                value={formatNumber(laptops.length)}
                hint="Across 7 brands"
                delta={8}
                icon={<LaptopIcon className="size-5" aria-hidden />}
              />
              {/* This card used to read `totalUsers = 4820` from a static seed
                  array, so a deployment with no accounts at all reported 4,820
                  of them. Real account figures are in `LiveStats` below, which
                  reads the database; this slot now shows a catalogue number,
                  which is something this component can actually know. */}
              <DashboardCard
                label="Products tracked"
                value={formatNumber(allProducts.length)}
                hint="Laptops, phones and headphones"
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

            {/* Live figures from the database. Kept visually separate from the
                catalogue charts below because the two have different sources and
                different failure modes: these need an admin session and can come
                back empty, those are compiled into the bundle and always render. */}
            <LiveStats />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
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

        {section === "users" ? <UserTable /> : null}

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
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
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
