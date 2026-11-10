#!/bin/sh
# Usage: scripts/check-weekly-export.sh <ego task-space id>, with results open in p1.
set -eu
case "${1:-}" in ''|*[!0-9]*) echo "Usage: $0 <ego task-space id>" >&2; exit 2 ;; esac

ego-browser nodejs <<JS
const task = await taskSpace($1);
const page = task.page("p1");
if (new URL(await page.url()).searchParams.get("step") !== "3") throw new Error("Open /weekly?step=3 in p1 first");
const fs = await import("node:fs/promises");
const os = await import("node:os");
const path = await import("node:path");
const {execFileSync} = await import("node:child_process");
const directory = await fs.mkdtemp(path.join(os.tmpdir(), "hummunication-export-"));
try {
  const start = Date.now();
  const downloadPromise = page.waitForEvent("download", {timeout:15000});
  await page.click('loc=role:button[name="전부 ZIP으로 받기"]');
  const download = await downloadPromise;
  const file = path.join(directory, "weekly.zip");
  await download.saveAs(file);
  const elapsed = Date.now() - start;
  if (elapsed > 15000) throw new Error("ZIP export exceeded 15 seconds");
  execFileSync("unzip", ["-t", file], {stdio:"pipe"});
  console.log("PASS: ZIP downloaded and archive validated in " + elapsed + " ms");
} finally {
  await fs.rm(directory, {recursive:true, force:true});
}
JS
