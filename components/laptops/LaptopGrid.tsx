"use client";

import { motion } from "framer-motion";
import { SearchX } from "lucide-react";
import { LaptopCard } from "./LaptopCard";
import { EmptyState } from "@/components/common/EmptyState";
import type { Laptop } from "@/lib/types/laptop";
import { staggerFast } from "@/lib/utils/animations";
import { cn } from "@/lib/utils/cn";

export interface LaptopGridProps {
  laptops: Laptop[];
  columns?: "three" | "four";
  emptyAction?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function LaptopGrid({
  laptops,
  columns = "four",
  emptyAction,
  emptyTitle = "No laptops match those filters",
  emptyDescription = "Try widening the price range or clearing a couple of filters — there are 25 machines in the catalogue.",
  className,
}: LaptopGridProps) {
  if (laptops.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="size-6" aria-hidden />}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <motion.div
      variants={staggerFast}
      initial="hidden"
      animate="visible"
      className={cn(
        "grid grid-cols-1 gap-5 sm:grid-cols-2",
        columns === "four" ? "xl:grid-cols-3 2xl:grid-cols-4" : "lg:grid-cols-3",
        className,
      )}
    >
      {laptops.map((laptop, index) => (
        <LaptopCard key={laptop.id} laptop={laptop} priority={index < 4} />
      ))}
    </motion.div>
  );
}
