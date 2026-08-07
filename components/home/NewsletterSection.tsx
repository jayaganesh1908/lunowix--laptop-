"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Mail } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { fadeUp, inView } from "@/lib/utils/animations";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function NewsletterSection() {
  const emailId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address, e.g. you@example.com");
      return;
    }
    setError(null);
    setSubmitting(true);

    // No backend in the demo — simulate the round trip so the UI states are real.
    window.setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      toast("You're on the list. Price drops land every Friday.");
    }, 700);
  };

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
    >
      <motion.div
        variants={fadeUp}
        {...inView}
        className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-transparent to-brand-600/10 px-6 py-12 sm:px-12 lg:px-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand-500/20 blur-[90px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-brand-600/15 blur-[100px]"
        />

        <div className="relative mx-auto max-w-2xl text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
            <Mail className="size-5" aria-hidden />
          </span>

          <h2
            id="newsletter-heading"
            className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Price drops, straight to your inbox
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base dark:text-ink-300">
            One email a week: notable discounts, new launches worth your attention, and
            nothing else.
          </p>

          {done ? (
            <p className="mt-8 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" aria-hidden />
              Subscribed as {email.trim()}
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row"
            >
              <div className="flex-1 text-left">
                <label htmlFor={emailId} className="sr-only">
                  Email address
                </label>
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className="h-11 w-full rounded-xl border border-ink-200 bg-white/80 px-4 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-white/15 dark:bg-white/5 dark:placeholder:text-ink-500"
                />
                {error ? (
                  <p id={errorId} role="alert" className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                    {error}
                  </p>
                ) : null}
              </div>
              <Button type="submit" loading={submitting} className="sm:shrink-0">
                Subscribe
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </section>
  );
}
