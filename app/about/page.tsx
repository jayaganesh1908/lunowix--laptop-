import type { Metadata } from "next";
import Link from "next/link";
import {
  Calculator,
  Database,
  Gauge,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { SectionHeading } from "@/components/common/SectionHeading";
import { buttonStyles } from "@/components/common/buttonStyles";
import { games } from "@/lib/data/games";
import { laptops } from "@/lib/data/laptops";
import { softwareCatalog } from "@/lib/data/software";

export const metadata: Metadata = {
  title: "About",
  description:
    "How Lunowix scores laptops: the performance model, the gaming benchmark estimates, and the software compatibility method behind every recommendation.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    icon: Gauge,
    title: "Scores, not spec dumps",
    body: "Every machine carries seven 0-100 scores — coding, gaming, editing, battery, display, AI development and an overall blend. A number you can compare beats a clock speed you have to interpret.",
  },
  {
    icon: Calculator,
    title: "One transparent model",
    body: "The same formulas run over every laptop. No machine gets a thumb on the scale, and because the model lives in one file you can read exactly how a score was reached.",
  },
  {
    icon: ShieldCheck,
    title: "Honest about limits",
    body: "These are modelled estimates, not measured benchmark runs. We say so on every page rather than dressing an estimate up as a lab result.",
  },
];

const METHOD = [
  {
    icon: Database,
    title: "Hardware scoring",
    body: "Each processor and GPU is placed on a normalised 0-100 scale. Memory, storage, panel and battery figures feed in with fixed weights, so two machines with the same parts always score the same.",
  },
  {
    icon: ScrollText,
    title: "Gaming estimates",
    body: `Every one of the ${games.length} titles has a "demand" value: the GPU score needed to hold roughly 60fps at High. Frame rates scale from that anchor, and the preset steps up or down depending on the headroom left over.`,
  },
  {
    icon: Users,
    title: "Software compatibility",
    body: `Each of the ${softwareCatalog.length} applications lists the CPU, GPU and memory it needs to run comfortably. A machine is rated on its weakest ratio, which is why a fast chip with 8GB of RAM still gets flagged for Premiere Pro.`,
  },
];

export default function AboutPage() {
  const brands = new Set(laptops.map((laptop) => laptop.brand)).size;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About" }]} />

      <header className="mt-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
          About Lunowix
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Buying advice that starts with what you do, not what you spec
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink-600 dark:text-ink-300">
          Most laptop listings hand you a table of part numbers and wish you luck.
          Lunowix turns those parts into answers to the questions people actually ask:
          will this run my games, will it handle Android Studio, and will the battery
          survive a lecture day?
        </p>
      </header>

      <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { value: laptops.length, label: "Laptops profiled" },
          { value: brands, label: "Brands covered" },
          { value: games.length, label: "Games benchmarked" },
          { value: softwareCatalog.length, label: "Apps rated" },
        ].map((stat) => (
          <div key={stat.label} className="card-surface px-4 py-5 text-center">
            <dt className="sr-only">{stat.label}</dt>
            <dd>
              <span className="block font-mono text-3xl font-bold tabular-nums text-brand-600 dark:text-brand-400">
                {stat.value}
              </span>
              <span className="mt-1 block text-xs text-ink-500 dark:text-ink-400">
                {stat.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-16">
        <SectionHeading align="left" eyebrow="Principles" title="What we optimise for" />
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="card-surface p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          align="left"
          eyebrow="Methodology"
          title="How the numbers are produced"
          description="Three models, all deterministic, all applied identically to every machine in the catalogue."
        />
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {METHOD.map(({ icon: Icon, title, body }) => (
            <article key={title} className="card-surface p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="card-surface mt-16 p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">A note on this data</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          Lunowix is a demonstration build. The {laptops.length} laptops, their prices
          and their review counts are illustrative rather than live retail data, and the
          frame rates are produced by the model described above rather than by running
          the games. The architecture is built so a real catalogue, real pricing feeds
          and measured benchmark results can replace the demo data without touching the
          interface.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/laptops" className={buttonStyles()}>
            Browse the catalogue
          </Link>
          <Link href="/contact" className={buttonStyles({ variant: "outline" })}>
            Get in touch
          </Link>
        </div>
      </section>
    </div>
  );
}
