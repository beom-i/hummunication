import { loginRequired, type AppError } from "@/lib/result";

export { loginRequired } from "@/lib/result";
export const teamAccountRequired: AppError = { code: "FORBIDDEN", message: "발급받은 팀원 계정으로 로그인해 주세요" };
export const authUnavailable: AppError = { code: "INTERNAL_ERROR", message: "로그인 상태를 확인하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요" };
export type AuthReason = "required" | "forbidden" | "unavailable" | "logged-out" | "invalid-link";

export function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/home";
  const url = new URL(next, "https://example.com");
  if (!["/home", "/weekly", "/bulletins", "/protected"].includes(url.pathname)) return "/home";
  return url.pathname + url.search;
}

export function loginHref(next: string, reason: AuthReason = "required") {
  return `/auth/login?${new URLSearchParams({ next: safeNextPath(next), reason })}`;
}

export function sessionError(claims: { sub?: unknown; is_anonymous?: unknown } | undefined, error?: { status?: number } | null): AppError | null {
  if (error && (error.status === 0 || error.status === 429 || (error.status ?? 0) >= 500)) return authUnavailable;
  if (error || !claims || typeof claims.sub !== "string" || !claims.sub) return loginRequired;
  if (claims.is_anonymous === true) return teamAccountRequired;
  return null;
}
