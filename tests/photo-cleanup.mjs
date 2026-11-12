import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cleanupPhotos } from "../src/features/files/cleanup.ts";
import { GET } from "../src/app/api/cron/photos/route.ts";

const originalSecret = process.env.CRON_SECRET;
try {
  delete process.env.CRON_SECRET;
  assert.equal((await GET(new Request("https://example.com/api/cron/photos"))).status, 401);
  process.env.CRON_SECRET = randomBytes(4).toString("hex");
  assert.equal((await GET(new Request("https://example.com/api/cron/photos", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }))).status, 401);
  process.env.CRON_SECRET = randomBytes(32).toString("hex");
  assert.equal((await GET(new Request("https://example.com/api/cron/photos", { headers: { authorization: `Bearer ${randomBytes(32).toString("hex")}` } }))).status, 401);
} finally {
  if (originalSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = originalSecret;
}
const id = "00000000-0000-4000-8000-000000000001";
for (const outcome of ["empty", "claim-error", "remove-error", "ack-error", "success"]) {
  const calls = [];
  const db = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === "claim_photo_cleanup") return outcome === "claim-error" ? { error: { code: "42501" } } : { data: outcome === "empty" ? [] : [{ id, path: "example/photo.png" }], error: null };
      return { error: outcome === "ack-error" ? { code: "XX000" } : null };
    },
    storage: { from(bucket) { assert.equal(bucket, "uploads"); return { async remove(paths) { calls.push({ name: "remove", paths }); return { error: outcome === "remove-error" ? {} : null }; } }; } },
  };
  const result = await cleanupPhotos(db);
  assert.equal(result.ok, ["empty", "success"].includes(outcome));
  assert.equal(calls.some(c => c.name === "remove"), !["empty", "claim-error"].includes(outcome));
  assert.equal(calls.some(c => c.name === "finish_photo_cleanup"), ["success", "ack-error"].includes(outcome), "Never acknowledge failed physical deletion");
  if (outcome === "success") { assert.deepEqual(result.data, { deleted: 1 }); assert.deepEqual(calls[2].args, { p_ids: [id] }); }
}
console.log("PASS: cleanup rejects unauthorized requests, deletes claimed files only and retries physical/ack failures");
