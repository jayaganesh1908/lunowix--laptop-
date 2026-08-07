import type { Metadata } from "next";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { WishlistBoard } from "@/components/wishlist/WishlistBoard";

export const metadata: Metadata = {
  title: "Your wishlist",
  description:
    "Everything you have saved, in one place — with quick links to compare, revisit or remove each machine.",
  alternates: { canonical: "/wishlist" },
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Your wishlist
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
        Saved to this browser — no account needed. Clearing site data clears the list.
      </p>

      <div className="mt-8">
        <WishlistBoard />
      </div>
    </div>
  );
}
