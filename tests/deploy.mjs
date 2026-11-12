import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const ready = { dryRun: true, target: { project_ref: "urqxygmiuyfhgfzdexgs" }, migrations: [] };
const check = value => spawnSync(process.execPath, ["scripts/check-applied-migrations.mjs"], { input: typeof value === "string" ? value : JSON.stringify(value), encoding: "utf8" }).status;
assert.equal(check(ready), 0);
assert.equal(check({ ...ready, migrations: ["unapplied.sql"] }), 1);
assert.equal(check({ ...ready, target: { project_ref: "another-project" } }), 1);
assert.equal(check({ ...ready, dryRun: false }), 1);
assert.equal(check("invalid JSON"), 1);
assert.equal(check(null), 1);
console.log("PASS: deployment accepts applied migrations and rejects pending, wrong-project or invalid checks");
