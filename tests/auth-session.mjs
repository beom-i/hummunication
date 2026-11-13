import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { loginHref, safeNextPath, sessionError } from "../src/features/auth/utils/session.ts";
import { databaseFailure } from "../src/lib/result.ts";

const mockServer = `export async function createClient(){return globalThis.__authTestDb;}`;
const mockSsr = `export function createServerClient(url,key,options){globalThis.__authTestCookies=options.cookies;return globalThis.__authTestDb;}`;
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "./server" && context.parentURL?.endsWith("/supabase/with-user.ts")) return { url: "data:text/javascript," + encodeURIComponent(mockServer), shortCircuit: true };
  if (specifier === "@supabase/ssr" && context.parentURL?.endsWith("/supabase/proxy.ts")) return { url: "data:text/javascript," + encodeURIComponent(mockSsr), shortCircuit: true };
  return next(specifier, context);
} });
const { withUser } = await import("../src/lib/supabase/with-user.ts");
const { proxy } = await import("../src/proxy.ts");
const { NextRequest } = await import("next/server.js");
const userId = "00000000-0000-4000-8000-000000000001";
const setClaims = (claims, error = null) => { globalThis.__authTestDb = { auth: { async getClaims() { return { data: claims ? { claims } : null, error }; } } }; };

assert.equal(sessionError(undefined).code, "UNAUTHORIZED");
assert.equal(sessionError({ sub: userId }, { status: 401 }).code, "UNAUTHORIZED");
assert.equal(sessionError({ sub: userId }, { status: 0 }).code, "INTERNAL_ERROR");
assert.equal(sessionError({ sub: userId }, { status: 503 }).code, "INTERNAL_ERROR");
assert.equal(sessionError({ sub: userId, is_anonymous: true }).code, "FORBIDDEN");
assert.equal(sessionError({ sub: userId }), null);
for (const path of [null, "https://example.com/home", "//example.com/home", "/\\example.com/home", "/auth/login", "/weekly/../auth/login"]) assert.equal(safeNextPath(path), "/home");
assert.equal(safeNextPath("/weekly?step=2&view=sermon"), "/weekly?step=2&view=sermon");
assert.equal(new URL(loginHref("/weekly?step=2"), "https://example.com").searchParams.get("next"), "/weekly?step=2");
for (const code of ["PGRST301", "PGRST302", "PGRST303"]) assert.equal(databaseFailure({ code }).error.code, "UNAUTHORIZED");
assert.equal(databaseFailure({ status: 401 }).error.code, "UNAUTHORIZED");
assert.equal(databaseFailure({ statusCode: "403" }).error.code, "FORBIDDEN");

for (const [claims, error, expected] of [[null, null, "UNAUTHORIZED"], [{ sub: userId }, { message: "Expired" }, "UNAUTHORIZED"], [{ sub: userId, is_anonymous: true }, null, "FORBIDDEN"]]) {
  setClaims(claims, error);
  let called = false;
  const result = await withUser(async () => { called = true; return { ok: true, data: null }; });
  assert.equal(result.error.code, expected); assert.equal(called, false, "Invalid sessions must never reach data access");
}
setClaims({ sub: userId });
assert.deepEqual(await withUser(async (_, id) => ({ ok: true, data: id })), { ok: true, data: userId });
assert.equal((await withUser(async () => { throw new Error("Private details"); })).error.code, "INTERNAL_ERROR");

setClaims(null);
for (const path of ["/", "/home", "/weekly?step=1", "/weekly?step=2&view=sermon", "/weekly?step=3", "/bulletins?date=2035-01-07", "/protected", "/auth/private"]) {
  const response = await proxy(new NextRequest("https://example.com" + path));
  assert.equal(response.status, 307, path);
  const target = new URL(response.headers.get("location"));
  assert.equal(target.pathname, "/auth/login"); assert.equal(target.searchParams.get("reason"), "required");
  if (path.startsWith("/weekly")) assert.equal(target.searchParams.get("next"), path);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
}
for (const path of ["/auth/login", "/auth/forgot-password", "/auth/update-password", "/auth/confirm", "/auth/error"]) assert.equal((await proxy(new NextRequest("https://example.com" + path))).status, 200);
const api = await proxy(new NextRequest("https://example.com/api/example"));
assert.equal(api.status, 401); assert.equal((await api.json()).error.code, "UNAUTHORIZED");
assert.equal((await proxy(new NextRequest("https://example.com/weekly", { method: "POST", headers: { "next-action": "example-action" } }))).status, 200, "Actions return their own typed withUser error");
assert.equal((await proxy(new NextRequest("https://example.com/weekly", { headers: { "next-action": "example-action" } }))).status, 307);
setClaims({ sub: userId, is_anonymous: true });
assert.equal((await proxy(new NextRequest("https://example.com/api/example"))).status, 403);
setClaims({ sub: userId });
assert.equal((await proxy(new NextRequest("https://example.com/weekly?step=1"))).status, 200);

globalThis.__authTestDb = { auth: { async getClaims() { globalThis.__authTestCookies.setAll([{ name: "example-auth", value: "", options: { path: "/", maxAge: 0 } }]); return { data: null, error: { message: "Expired" } }; } } };
const redirectedCookies = (await proxy(new NextRequest("https://example.com/home"))).headers.get("set-cookie");
assert.match(redirectedCookies, /example-auth=/, "Refreshed/removed cookies must survive login redirects");
assert.match(redirectedCookies, /Max-Age=0/i, "Cookie expiry options must survive the redirect");
globalThis.__authTestDb = { auth: { async getClaims() { throw new Error("Offline"); } } };
assert.equal((await proxy(new NextRequest("https://example.com/api/example"))).status, 503);
console.log("PASS: login guards and server error contracts");
