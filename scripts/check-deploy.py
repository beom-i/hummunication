"""Check deployment control flow with fake CLIs; never contact GitHub or Vercel."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile

script = Path(__file__).with_name("deploy.sh").resolve()
stub = '''
import json, os, sys
name = os.path.basename(sys.argv[0])
args = sys.argv[1:]
case = os.environ["DEPLOY_CASE"]
with open(os.environ["DEPLOY_LOG"], "a") as log:
    log.write(json.dumps([name, *args]) + "\\n")
if name == "git":
    if args[0] == "status" and case == "dirty": print(" M example.ts")
    elif args[:2] == ["branch", "--show-current"]: print("main" if case == "main" else "feat/example")
    elif args[0] == "rev-parse": print("a" * 40)
    elif args[0] == "diff" and case == "migration": print("supabase/migrations/example.sql")
    elif args[0] == "log": print("feat: example release")
    elif args[0] == "rev-list": print("a" * 40)
elif name == "gh":
    if args[:2] == ["pr", "list"]:
        if case == "resumed" and args[args.index("--state") + 1] == "merged": print(8)
    elif args[:2] == ["pr", "create"]: print("https://github.com/example/project/pull/8")
    elif args[:2] == ["pr", "view"]:
        field = args[args.index("--json") + 1]
        if field == "number": print(8)
        elif field == "url": print("https://github.com/example/project/pull/8")
        elif field == "state": print("MERGED" if case == "resumed" else "OPEN")
        elif field == "statusCheckRollup": print("true")
        elif field == "mergeCommit": print("b" * 40)
        else: sys.exit(2)
    elif args[:2] == ["pr", "checks"]:
        if "--watch" in args: sys.exit(1 if case == "ci-failed" else 0)
        print("false" if case == "ci-skipped" else "true")
    elif args[0] == "api":
        print(("failure" if case == "deploy-failed" else "success") + "\\thttps://vercel.com/example/deployment")
elif name == "node" and args[0] == "scripts/check-applied-migrations.mjs" and case == "migration":
    sys.exit(1)
elif name not in ["pnpm", "node", "sleep"]:
    sys.exit(2)
'''

with tempfile.TemporaryDirectory(prefix="hummunication-deploy-check-") as directory:
    root = Path(directory)
    for command in ["git", "gh", "pnpm", "node", "sleep"]:
        file = root / command
        file.write_text(f"#!{sys.executable}\n{stub}")
        file.chmod(0o755)
    for case in ["success", "resumed", "dirty", "main", "migration", "ci-failed", "ci-skipped", "deploy-failed"]:
        log = root / f"{case}.jsonl"
        result = subprocess.run(
            ["/bin/bash", str(script)], capture_output=True, text=True,
            env={"PATH": f"{directory}:/usr/bin:/bin", "DEPLOY_CASE": case, "DEPLOY_LOG": str(log)},
            timeout=15,
        )
        calls = [json.loads(line) for line in log.read_text().splitlines()]
        merged = any(call[:3] == ["gh", "pr", "merge"] for call in calls)
        published = any(call[:2] == ["git", "push"] for call in calls)
        assert (result.returncode == 0) == (case in ["success", "resumed"]), (case, result.stdout, result.stderr)
        assert merged == (case in ["success", "deploy-failed"]), (case, calls)
        if merged:
            merge = next(call for call in calls if call[:3] == ["gh", "pr", "merge"])
            assert "--match-head-commit" in merge and "a" * 40 in merge and "--admin" not in merge
        if case in ["dirty", "main", "migration"]:
            assert not published, (case, calls)
        if case in ["success", "resumed"]:
            assert "배포 완료:" in result.stdout
        print(f"PASS: {case}")
