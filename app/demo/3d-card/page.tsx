"use client";

import { InteractiveTravelCard } from "@/components/ui/3d-card";
import { LaptopCard } from "@/components/laptops/LaptopCard";
import { laptops } from "@/lib/data/laptops";

/**
 * Side-by-side reference for the 3D tilt: the upstream `InteractiveTravelCard`
 * next to real `LaptopCard`s driven by the same `useTilt` hook, so the effect
 * can be compared on both at their real sizes.
 */
export default function ThreeDCardDemoPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">3D tilt reference</h1>
      <p className="mt-2 text-ink-500 dark:text-ink-400">
        Hover each card and move the pointer across it. Mouse only — there is no
        hover on touch, and the effect is disabled under &quot;reduce motion&quot;.
      </p>

      <section className="mt-12">
        <h2 className="text-sm font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          InteractiveTravelCard
        </h2>
        <div className="mt-6 flex justify-center">
          <InteractiveTravelCard
            title="Sapa Valley"
            subtitle="Vietnam"
            imageUrl="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2074&auto=format&fit=crop"
            actionText="Book your trip"
            href="https://en.wikipedia.org/wiki/Sa_Pa"
            onActionClick={() => {
              alert("This action can be customized via the onActionClick prop.");
            }}
          />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-sm font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          LaptopCard — same tilt, real card
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {laptops.slice(0, 3).map((laptop) => (
            <LaptopCard key={laptop.id} laptop={laptop} priority />
          ))}
        </div>
      </section>
    </div>
  );
}
