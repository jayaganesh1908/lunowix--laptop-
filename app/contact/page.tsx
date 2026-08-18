import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessagesSquare } from "lucide-react";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Ask for a personal laptop recommendation, report a data error, or get in touch about a partnership.",
  alternates: { canonical: "/contact" },
};

const DETAILS = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@lunowix.example",
    hint: "Best for buying advice and data corrections.",
  },
  {
    icon: Clock,
    label: "Response time",
    value: "Within 2 working days",
    hint: "Monday to Friday, 10:00 – 18:00 IST.",
  },
  {
    icon: MapPin,
    label: "Based in",
    value: "Bengaluru, India",
    hint: "Prices and availability are tracked for the Indian market.",
  },
  {
    icon: MessagesSquare,
    label: "Community",
    value: "@lunowix",
    hint: "Quick questions get quicker answers on social.",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />

      <header className="mt-6 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Get in touch</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
          Stuck between two machines? Spotted a spec that looks wrong? Send it over —
          the more context you give, the more useful the answer.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem]">
        <ContactForm />

        <aside className="space-y-4">
          {DETAILS.map(({ icon: Icon, label, value, hint }) => (
            <div key={label} className="card-surface flex gap-4 p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{hint}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
