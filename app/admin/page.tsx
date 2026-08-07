import type { Metadata } from "next";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin dashboard",
  description:
    "Catalogue, user, review, game and software overview for the Lunowix demo dataset.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Admin" }]} />

      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Admin dashboard
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
        Everything below is computed from the demo dataset in{" "}
        <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">
          lib/data
        </code>
        . Swap that for an API and the views keep working unchanged.
      </p>

      <div className="mt-8">
        <AdminDashboard />
      </div>
    </div>
  );
}
