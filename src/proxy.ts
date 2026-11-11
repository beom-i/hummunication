import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  if (["/", "/home", "/weekly", "/bulletins"].includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    // All paths except Next internals, favicon and static images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
