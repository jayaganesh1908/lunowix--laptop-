"use client";

import { motion } from "framer-motion";
import {
  Columns3,
  Gamepad2,
  IndianRupee,
  MessageSquareQuote,
  TerminalSquare,
  TrendingUp,
} from "lucide-react";
import { FeatureCard } from "@/components/common/FeatureCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { inView, staggerContainer } from "@/lib/utils/animations";

const FEATURES = [
  {
    icon: <IndianRupee className="size-5" aria-hidden />,
    title: "Budget recommendations",
    description:
      "Six price bands mapped to the whole catalogue, so you start from what you can spend rather than a spec sheet.",
  },
  {
    icon: <Gamepad2 className="size-5" aria-hidden />,
    title: "Gaming performance",
    description:
      "Estimated frame rates and the preset that gets you there, for ten of the titles people actually play.",
  },
  {
    icon: <TerminalSquare className="size-5" aria-hidden />,
    title: "Software compatibility",
    description:
      "Android Studio, Premiere Pro, Blender and more — each rated against the machine's real CPU, GPU and memory headroom.",
  },
  {
    icon: <Columns3 className="size-5" aria-hidden />,
    title: "Side-by-side comparison",
    description:
      "Two laptops, one table, with the stronger figure in every row highlighted so the trade-offs are obvious.",
  },
  {
    icon: <MessageSquareQuote className="size-5" aria-hidden />,
    title: "Expert reviews",
    description:
      "Short, opinionated summaries that say who a machine is for — and who should walk past it.",
  },
  {
    icon: <TrendingUp className="size-5" aria-hidden />,
    title: "Latest prices",
    description:
      "Street prices against list prices, so a genuine discount is easy to separate from an inflated MRP.",
  },
];

export function WhyChoose() {
  return (
    <section
      aria-labelledby="why-heading"
      className="relative overflow-hidden py-16 lg:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-72 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,107,0,0.08),transparent_70%)]"
      />

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Why Lunowix"
          title={<span id="why-heading">Built around how you actually use a laptop</span>}
          description="Clock speeds do not tell you whether Android Studio will crawl or whether Cyberpunk will hold 60fps. These will."
        />

        <motion.div
          variants={staggerContainer}
          {...inView}
          className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
