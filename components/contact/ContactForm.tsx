"use client";

import { CheckCircle2, MailWarning, Send } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils/cn";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const SUBJECTS = [
  "Buying advice",
  "Report incorrect data",
  "Partnership enquiry",
  "Something else",
];

interface Fields {
  name: string;
  email: string;
  subject: string;
  message: string;
}

type Errors = Partial<Record<keyof Fields, string>>;

function validate(fields: Fields): Errors {
  const errors: Errors = {};
  if (fields.name.trim().length < 2) errors.name = "Tell us what to call you.";
  if (!EMAIL_PATTERN.test(fields.email.trim()))
    errors.email = "Enter a valid email address, e.g. you@example.com";
  if (!fields.subject) errors.subject = "Pick a subject so it reaches the right person.";
  if (fields.message.trim().length < 20)
    errors.message = "A little more detail helps — 20 characters minimum.";
  return errors;
}

const fieldClass = (invalid: boolean) =>
  cn(
    "w-full rounded-xl border bg-white/80 px-4 py-3 text-sm outline-none transition placeholder:text-ink-400",
    "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25",
    "dark:bg-ink-950/60 dark:placeholder:text-ink-500",
    invalid
      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/25"
      : "border-ink-200 dark:border-white/15",
  );

export function ContactForm() {
  const ids = {
    name: useId(),
    email: useId(),
    subject: useId(),
    message: useId(),
  };

  const [fields, setFields] = useState<Fields>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  /** Reached when the deployment has no mail provider — see `onSubmit`. */
  const [undeliverable, setUndeliverable] = useState(false);
  const { toast } = useToast();

  const update = (key: keyof Fields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    // Clear a field's error as soon as the user starts fixing it.
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  /*
   * A real POST, not a timer.
   *
   * The three outcomes are kept apart on purpose. Delivered says so. A
   * deployment without mail credentials (501) says THAT, rather than promising
   * a reply nobody will send — the honest failure is the whole point of wiring
   * this up. Anything else is a transient failure the visitor can retry.
   */
  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (response.ok) {
        setSent(true);
        toast("Message sent. We reply within two working days.");
        return;
      }

      if (response.status === 501) {
        setUndeliverable(true);
        toast("This deployment has no mail set up — nothing was sent.");
        return;
      }

      toast("The message could not be sent. Please try again.");
    } catch {
      toast("No connection. Check your network and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (undeliverable) {
    return (
      <div className="card-surface flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <MailWarning className="size-6" aria-hidden />
        </span>
        <div className="max-w-md">
          <h2 className="text-lg font-semibold tracking-tight">Nothing was sent</h2>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
            This deployment has no mail provider configured, so your message could not
            be delivered and no one will see it. Set <code>RESEND_API_KEY</code> and{" "}
            <code>CONTACT_TO_EMAIL</code> to turn this form on.
          </p>
        </div>
        <Button variant="outline" onClick={() => setUndeliverable(false)}>
          Back to the form
        </Button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="card-surface flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>
        <div className="max-w-md">
          <h2 className="text-lg font-semibold tracking-tight">Message sent</h2>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
            Thanks {fields.name.trim().split(" ")[0]} — we will reply to{" "}
            {fields.email.trim()} within two working days.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setSent(false);
            setFields({ name: "", email: "", subject: "", message: "" });
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card-surface space-y-5 p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={ids.name} className="mb-1.5 block text-sm font-medium">
            Your name
          </label>
          <input
            id={ids.name}
            value={fields.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Priya Nair"
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${ids.name}-error` : undefined}
            className={fieldClass(Boolean(errors.name))}
          />
          {errors.name ? (
            <p id={`${ids.name}-error`} role="alert" className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={ids.email} className="mb-1.5 block text-sm font-medium">
            Email address
          </label>
          <input
            id={ids.email}
            type="email"
            value={fields.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${ids.email}-error` : undefined}
            className={fieldClass(Boolean(errors.email))}
          />
          {errors.email ? (
            <p id={`${ids.email}-error`} role="alert" className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
              {errors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor={ids.subject} className="mb-1.5 block text-sm font-medium">
          Subject
        </label>
        <select
          id={ids.subject}
          value={fields.subject}
          onChange={(event) => update("subject", event.target.value)}
          aria-invalid={errors.subject ? true : undefined}
          aria-describedby={errors.subject ? `${ids.subject}-error` : undefined}
          className={fieldClass(Boolean(errors.subject))}
        >
          <option value="">Choose a subject…</option>
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
        {errors.subject ? (
          <p id={`${ids.subject}-error`} role="alert" className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
            {errors.subject}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={ids.message} className="mb-1.5 block text-sm font-medium">
          Message
        </label>
        <textarea
          id={ids.message}
          rows={6}
          value={fields.message}
          onChange={(event) => update("message", event.target.value)}
          placeholder="Tell us your budget, what you will use the laptop for, and anything you have already shortlisted."
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? `${ids.message}-error` : undefined}
          className={cn(fieldClass(Boolean(errors.message)), "resize-y")}
        />
        {errors.message ? (
          <p id={`${ids.message}-error`} role="alert" className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
            {errors.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="lg"
        loading={submitting}
        icon={<Send className="size-4" aria-hidden />}
        className="w-full sm:w-auto"
      >
        Send message
      </Button>
    </form>
  );
}
