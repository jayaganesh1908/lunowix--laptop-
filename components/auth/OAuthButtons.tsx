"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { signInWithProvider } from "@/app/auth/actions";
import {
  AppleMark,
  DiscordMark,
  GithubMark,
  GitlabMark,
  GoogleMark,
} from "./ProviderIcons";
import { cn } from "@/lib/utils/cn";

const PROVIDERS: Record<
  string,
  { label: string; Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement }
> = {
  google: { label: "Google", Icon: GoogleMark },
  github: { label: "GitHub", Icon: GithubMark },
  discord: { label: "Discord", Icon: DiscordMark },
  gitlab: { label: "GitLab", Icon: GitlabMark },
  apple: { label: "Apple", Icon: AppleMark },
};

function ProviderButton({
  provider,
  label,
  Icon,
  soloRow,
}: {
  provider: string;
  label: string;
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  soloRow: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="provider"
      value={provider}
      disabled={pending}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border text-sm font-semibold transition",
        "border-ink-200 bg-white hover:border-brand-400 hover:bg-brand-50",
        "dark:border-white/15 dark:bg-ink-950/60 dark:hover:border-brand-500/60 dark:hover:bg-brand-500/10",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Icon className="size-[18px]" />
      )}
      {soloRow ? `Continue with ${label}` : label}
    </button>
  );
}

export function OAuthButtons({
  providers,
  next,
}: {
  providers: string[];
  next?: string;
}) {
  const known = providers.filter((provider) => provider in PROVIDERS);
  if (known.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-2.5",
        known.length > 1 && "sm:grid-cols-2",
      )}
    >
      {known.map((provider) => (
        // One form per provider so `useFormStatus` reports the pending state of
        // the button that was actually clicked, not all of them at once.
        <form key={provider} action={signInWithProvider}>
          <input type="hidden" name="next" value={next ?? "/profile"} />
          <ProviderButton
            provider={provider}
            label={PROVIDERS[provider].label}
            Icon={PROVIDERS[provider].Icon}
            soloRow={known.length === 1}
          />
        </form>
      ))}
    </div>
  );
}
