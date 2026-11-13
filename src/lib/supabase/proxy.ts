import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authUnavailable, loginHref, sessionError } from "@/features/auth/utils/session";
import type { AppError } from "@/lib/result";

const PUBLIC_PATHS = ["/auth/login", "/auth/forgot-password", "/auth/update-password", "/auth/confirm", "/auth/error"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  let failure: AppError | null;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims():
  // getClaims() verifies the JWT and refreshes the session cookie.
  try {
    const { data, error } = await supabase.auth.getClaims();
    failure = sessionError(data?.claims, error);
  } catch { failure = authUnavailable; }

  if (failure && !PUBLIC_PATHS.includes(pathname)) {
    let response: NextResponse;
    if (pathname.startsWith("/api/")) {
      let status = 401;
      if (failure.code === "FORBIDDEN") status = 403;
      else if (failure.code === "INTERNAL_ERROR") status = 503;
      response = NextResponse.json({ ok: false, error: failure }, { status });
    } else {
      let reason: "required" | "forbidden" | "unavailable" = "required";
      if (failure.code === "FORBIDDEN") reason = "forbidden";
      else if (failure.code === "INTERNAL_ERROR") reason = "unavailable";
      response = NextResponse.redirect(new URL(loginHref(pathname + request.nextUrl.search, reason), request.url));
    }
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  // Return supabaseResponse as-is so refreshed cookies reach the browser.
  supabaseResponse.headers.set("Cache-Control", "private, no-store");
  return supabaseResponse;
}
