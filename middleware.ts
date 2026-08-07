import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Routes that require a signed-in user. */
const PROTECTED = ["/profile", "/admin"];

export async function middleware(request: NextRequest) {
  // Without credentials there is no session to refresh and nothing to guard —
  // the app runs in static-catalogue mode.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshes an expiring token and writes the rotated cookies onto `response`.
  // This must run before any redirect logic reads the user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && PROTECTED.some((route) => pathname.startsWith(route))) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/auth/login";
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  // Someone already signed in has no business on the sign-in screens.
  if (user && pathname.startsWith("/auth/") && !pathname.startsWith("/auth/callback")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/profile";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — the session only needs
     * refreshing on requests that can render or mutate something.
     */
    "/((?!_next/static|_next/image|favicon.ico|laptop-images|logos|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4)$).*)",
  ],
};
