import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ready = { dryRun: true, target: { project_ref: "urqxygmiuyfhgfzdexgs" }, migrations: [] };
const check = value => spawnSync(process.execPath, ["scripts/check-applied-migrations.mjs"], { input: typeof value === "string" ? value : JSON.stringify(value), encoding: "utf8" }).status;
assert.equal(check(ready), 0);
assert.equal(check({ ...ready, migrations: ["unapplied.sql"] }), 1);
assert.equal(check({ ...ready, target: { project_ref: "another-project" } }), 1);
assert.equal(check({ ...ready, dryRun: false }), 1);
assert.equal(check("invalid JSON"), 1);
assert.equal(check(null), 1);
console.log("PASS: deployment accepts applied migrations and rejects pending, wrong-project or invalid checks");

// Exercise the actual shell caller; external commands stop before any build or push.
const bin = mkdtempSync(join(tmpdir(), "hummunication-deploy-"));
try {
  const command = (name, body) => writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  command("gh", "exit 0");
  command("git", `case "$1" in
    status|fetch) exit 0 ;;
    branch) echo feature/deploy-test ;;
    rev-parse) echo test-head ;;
    diff) echo supabase/migrations/example.sql ;;
    *) exit 99 ;;
  esac`);
  command("pnpm", `if [ "$1" = exec ]; then
    case " $* " in
      *" --output-format json "*) printf '%s\\n' '${JSON.stringify(ready)}' ;;
      *) echo 'Database is already up to date.' ;;
    esac
  else
    exit 73
  fi`);
  const deployed = spawnSync("bash", ["scripts/deploy.sh"], { encoding: "utf8", env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(deployed.status, 73, `Expected to reach local checks after parsing DB output: ${deployed.stderr}`);
  assert.match(deployed.stdout, /운영 DB에 모든 마이그레이션이 적용돼 있어요/);
  console.log("PASS: the real deploy script explicitly requests JSON in a regular terminal");
} finally {
  rmSync(bin, { recursive: true, force: true });
}
