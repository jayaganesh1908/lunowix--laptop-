import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonStyles } from "@/components/common/buttonStyles";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-28 text-center sm:px-6">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
        <Compass className="size-7" aria-hidden />
      </span>
      <p className="mt-6 font-mono text-sm font-semibold tracking-widest text-brand-600 dark:text-brand-400">
        404
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        We could not find that page
      </h1>
      <p className="mt-3 text-sm text-ink-600 sm:text-base dark:text-ink-300">
        The link may be out of date, or the laptop may have left the catalogue.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/laptops" className={buttonStyles()}>
          Browse all laptops
        </Link>
        <Link href="/" className={buttonStyles({ variant: "outline" })}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
