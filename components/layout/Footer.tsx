import Link from "next/link";
import {
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  XIcon,
  YoutubeIcon,
} from "@/components/common/SocialIcons";
import { Logo } from "@/components/common/Logo";
import { budgetBands } from "@/lib/data/laptops";
import { categories } from "@/lib/types";

const COLUMNS = [
  {
    title: "Browse",
    /* One entry per category, derived rather than listed — the footer had only
       ever gained `/laptops`, so phones and headphones were absent here too.
       "Compare" and "Wishlist" span every category, so they stay fixed. */
    links: [
      ...categories.map((category) => ({
        href: `/${category.route}`,
        label: `All ${category.pluralLabel.toLowerCase()}`,
      })),
      { href: "/compare", label: "Compare products" },
      { href: "/wishlist", label: "Your wishlist" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Lunowix" },
      { href: "/contact", label: "Contact us" },
      { href: "/admin", label: "Admin dashboard" },
    ],
  },
];

const SOCIALS = [
  { href: "https://x.com", label: "Lunowix on X", Icon: XIcon },
  { href: "https://instagram.com", label: "Lunowix on Instagram", Icon: InstagramIcon },
  { href: "https://youtube.com", label: "Lunowix on YouTube", Icon: YoutubeIcon },
  { href: "https://linkedin.com", label: "Lunowix on LinkedIn", Icon: LinkedinIcon },
  { href: "https://github.com", label: "Lunowix on GitHub", Icon: GithubIcon },
];

export function Footer() {
  /* The band is a neutral scrim, not an `ink-50` wash. `bg-ink-50/60` over an
     `ink-50` page composites to the page exactly, so it was invisible in light
     mode — provably so once the page token deepened. Darkening whatever sits
     behind it is what the dark variant already does, so both themes now express
     the footer the same way. */
  return (
    <footer className="mt-24 border-t border-ink-900/5 bg-ink-900/5 dark:border-white/10 dark:bg-ink-900/40">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              Laptop recommendations built around what you actually do — your budget,
              your games and the software you open every morning.
            </p>
            <ul className="mt-5 flex gap-2">
              {SOCIALS.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-ink-200 text-ink-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-white/15 dark:text-ink-300 dark:hover:border-brand-500/60 dark:hover:text-brand-400"
                  >
                    <Icon className="size-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest">By budget</h2>
            <ul className="mt-4 space-y-2.5">
              {budgetBands.map((band) => (
                <li key={band.slug}>
                  <Link
                    href={`/laptops?budget=${band.slug}`}
                    className="text-sm text-ink-600 transition hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400"
                  >
                    {band.shortLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-bold uppercase tracking-widest">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-600 transition hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ink-900/5 pt-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:text-ink-400">
          <p>© {new Date().getFullYear()} Lunowix. Demo data — prices are illustrative.</p>
          <p>
            Performance figures are modelled estimates, not measured benchmarks.
          </p>
        </div>
      </div>
    </footer>
  );
}
