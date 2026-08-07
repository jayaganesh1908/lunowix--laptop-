"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { maybeSendWelcome } from "@/lib/auth/welcome-once";
import { getSiteUrl } from "@/lib/auth/site-url";

export interface AuthState {
  error?: string;
  message?: string;
}

const email = z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address.");
const password = z.string().min(8, "Use at least 8 characters.");

const NOT_CONFIGURED: AuthState = {
  error:
    "Authentication is not configured yet. Add your Supabase keys to .env.local and restart the dev server.",
};

/** Safe redirect target — only same-site paths, never an absolute URL. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/profile";
}

/* --------------------------------- OAuth --------------------------------- */

/**
 * Returns `void` rather than an `AuthState`: this is used as a bare `<form
 * action>`, which requires a void-returning function. Failures surface by
 * redirecting back to the sign-in page with an `error` query param.
 */
export async function signInWithProvider(formData: FormData): Promise<void> {
  const provider = String(formData.get("provider") ?? "");
  const next = safeNext(formData.get("next"));

  // The annotation lives on the variable, not just the arrow: TypeScript only
  // uses a never-returning call for control-flow narrowing when the *binding*
  // is explicitly typed.
  const fail: (message: string) => never = (message) =>
    redirect(`/auth/login?error=${encodeURIComponent(message)}`);

  if (!provider) fail("Unknown sign-in provider.");

  const supabase = await createSupabaseServerClient();
  if (!supabase) fail(NOT_CONFIGURED.error!);

  const { data, error } = await supabase!.auth.signInWithOAuth({
    // Cast: the provider list is env-driven, and Supabase validates it anyway.
    provider: provider as "google" | "github",
    options: {
      redirectTo: `${await getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) fail(error.message);
  if (!data.url) fail("Could not start the sign-in flow.");

  // Outside any try/catch on purpose — redirect() signals by throwing.
  redirect(data.url);
}

/* ------------------------------ Email + password -------------------------- */

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z
    .object({ email, password: z.string().min(1, "Enter your password.") })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  await maybeSendWelcome();
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Enter your name."),
      email,
      password: password.refine((value) => /\d/.test(value), {
        message: "Include at least one number.",
      }),
    })
    .safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NOT_CONFIGURED;

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Picked up by the handle_new_user trigger to populate the profile.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await getSiteUrl()}/auth/callback`,
    },
  });

  if (error) return { error: error.message };

  // No session means email confirmation is on — the welcome mail goes out from
  // the callback once they click through.
  if (!data.session) {
    return {
      message: `Check ${parsed.data.email} for a confirmation link to finish setting up your account.`,
    };
  }

  await maybeSendWelcome();
  revalidatePath("/", "layout");
  redirect("/profile");
}

/* -------------------------------- Magic link ------------------------------ */

export async function signInWithMagicLink(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z.object({ email }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${await getSiteUrl()}/auth/callback` },
  });

  if (error) return { error: error.message };
  return { message: `Sign-in link sent to ${parsed.data.email}. It expires in an hour.` };
}

/* ----------------------------- Password reset ----------------------------- */

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z.object({ email }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getSiteUrl()}/auth/callback?next=/auth/reset-password`,
  });

  if (error) return { error: error.message };

  // Deliberately not revealing whether the address exists.
  return {
    message: `If an account exists for ${parsed.data.email}, a reset link is on its way.`,
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z
    .object({
      password: password.refine((value) => /\d/.test(value), {
        message: "Include at least one number.",
      }),
      confirm: z.string(),
    })
    .refine((values) => values.password === values.confirm, {
      message: "Passwords do not match.",
    })
    .safeParse({
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NOT_CONFIGURED;

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/profile");
}

/* --------------------------------- Sign out ------------------------------- */

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
