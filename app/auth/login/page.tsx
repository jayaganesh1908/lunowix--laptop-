import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { VintageKeyboard } from "@/components/ui/vintage-keyboard";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Lunowix to keep your wishlist and comparisons.",
};

/**
 * Sign-in.
 *
 * Real now: `SignInPanel` posts to `/api/auth/login`, which sets an httpOnly
 * session cookie and folds this browser's saved wishlist into the account. This
 * file stays a server component so it can export `metadata`; the hooks live in
 * the panel.
 *
 * `mirrorTyping` lets the board light up as the email field is typed into. The
 * password field is excluded inside the component and cannot be opted in.
 *
 * The keyboard sits beside the form rather than under it, and is hidden below
 * `lg`: at tablet width the two halves squeeze the card past the point where
 * its 3D tilt reads as anything but jitter.
 *
 * The wrapper fills the viewport minus the header so the pair sits centred in
 * the window rather than parked under the nav. With the footer suppressed on
 * `/auth` (see `ChromeSlot`), that is what removes the scrollbar — the layout
 * itself is unchanged.
 */
export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4.125rem)] w-full max-w-[1400px] items-center gap-12 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex w-full justify-center lg:w-[42%]">
        {/* `useSearchParams` needs a Suspense boundary to keep the rest of the
            route statically renderable. */}
        <Suspense fallback={null}>
          <SignInPanel />
        </Suspense>
      </div>

      {/* `aria-hidden`: the board is decorative here. It mirrors the physical
          keyboard, so announcing it would put a second, meaningless keyboard in
          the accessibility tree right next to a real form. */}
      <div aria-hidden className="hidden flex-1 lg:block">
        <VintageKeyboard mirrorTyping />
      </div>
    </div>
  );
}
