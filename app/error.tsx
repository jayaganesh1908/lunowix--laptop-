"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/common/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Swap for a real reporter (Sentry, etc.) when a backend is wired in.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-28 text-center sm:px-6">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <TriangleAlert className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Something broke</h1>
      <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
        An unexpected error stopped this page from rendering.
        {error.digest ? (
          <>
            {" "}
            Reference: <code className="font-mono text-xs">{error.digest}</code>
          </>
        ) : null}
      </p>
      <Button onClick={reset} className="mt-8">
        Try again
      </Button>
    </div>
  );
}
