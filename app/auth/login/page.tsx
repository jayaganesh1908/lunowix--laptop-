import type { Metadata } from "next";
import { SignInCard } from "@/components/ui/sign-in-card-2";
import { VintageKeyboard } from "@/components/ui/vintage-keyboard";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Lunowix to keep your wishlist and comparisons.",
};

/**
 * Sign-in, front end only.
 *
 * There is no auth backend — Supabase and every server action went with it — so
 * the form validates, shows its pending state and resolves without sending a
 * credential anywhere. Wire `onSubmit` on `SignInCard` before this is a real
 * login.
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
        <SignInCard />
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
