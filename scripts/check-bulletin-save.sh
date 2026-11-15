#!/bin/sh
# Usage: scripts/check-bulletin-save.sh <ego task-space id>, with localhost open in p1.
set -eu
case "${1:-}" in ''|*[!0-9]*) echo "Usage: $0 <ego task-space id>" >&2; exit 2 ;; esac
test_module="$(cd "$(dirname "$0")/.." && pwd)/tests/server-only-storage.browser.mjs"
ego-browser nodejs <<JS
const page = (await taskSpace($1)).page("p1");
const { verifyServerOnlyStorage } = await import("$test_module");
console.log(await verifyServerOnlyStorage(page));
JS
