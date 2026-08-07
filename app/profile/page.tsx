import type { Metadata } from "next";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { ProfilePanel } from "@/components/profile/ProfilePanel";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Your Lunowix account, wishlist and comparison history.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Your profile
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
        Everything below lives in this browser. Signing out clears the account but keeps
        your wishlist.
      </p>

      <div className="mt-8">
        <ProfilePanel />
      </div>
    </div>
  );
}
