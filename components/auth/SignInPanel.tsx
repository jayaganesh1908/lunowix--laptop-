"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { SignInCard } from "@/components/ui/sign-in-card-2";
import { useSession } from "@/lib/hooks/useSession";
import { useToast } from "@/components/providers/ToastProvider";

/**
 * The client half of `/auth/login`.
 *
 * The page itself stays a server component so it can export `metadata`; this
 * holds the hooks. On success it sends the visitor to `?next=`, or to the
 * wishlist, which is the thing an account is actually for here.
 */
export function SignInPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, signIn } = useSession();
  const { toast } = useToast();

  /**
   * Only a same-origin, absolute PATH is accepted.
   *
   * `?next=https://elsewhere.example` on a login page is the classic open
   * redirect: the link looks like the real site, the visitor signs in, and they
   * land on someone else's page primed to re-enter a password. `//host` is
   * rejected too — a protocol-relative URL is off-site despite starting with a
   * slash.
   */
  const raw = params.get("next");
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/wishlist";

  // Someone already signed in has no business on the login form.
  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  return (
    <SignInCard
      onSubmit={async (values) => {
        const result = await signIn(values);
        if (result.ok) {
          toast("Signed in. Your saved products are synced.");
          router.replace(next);
        }
        return result;
      }}
    />
  );
}
