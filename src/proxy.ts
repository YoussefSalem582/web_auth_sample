import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

/**
 * Next.js 16 renamed `middleware` to `proxy`. Same job: runs before every
 * matched request.
 *
 * Two things happen here, in order:
 *   1. next-intl decides the locale and may redirect/rewrite (/ -> /ar)
 *   2. Supabase refreshes the auth cookies onto whatever response came out of 1
 */

const handleI18n = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = handleI18n(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Do not remove: this refreshes the session cookie. Without it users get
  // signed out at random.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Optimistic auth gate. The real check still happens in each protected page.
  // TODO: add your own protected path prefixes here.
  const protectedPaths = ["/dashboard", "/demo"];
  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale =
    "/" + pathname.split("/").slice(2).join("/").replace(/\/$/, "");
  const locale = pathname.split("/")[1] || routing.defaultLocale;

  if (!user && protectedPaths.some((p) => pathWithoutLocale.startsWith(p))) {
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  // Skip API routes (Paymob's webhook must not be redirected), static files
  // and images.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
