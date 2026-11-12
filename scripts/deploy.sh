#!/usr/bin/env bash
# Run from any directory: bash /path/to/hummunication/scripts/deploy.sh
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
repo="beom-i/hummunication"
production_url="https://hummunication.com/home"
fail() { printf '%s\n' "$*" >&2; exit 1; }
trap 'printf "배포가 중단됐어요 (%s행). 오류를 확인한 후 다시 실행해 주세요.\n" "$LINENO" >&2' ERR

for command in git gh pnpm; do
  command -v "$command" >/dev/null || fail "$command 설치 후 다시 실행해 주세요."
done
gh auth status >/dev/null 2>&1 || fail "먼저 gh auth login을 실행해 주세요."
[[ -z "$(git status --porcelain)" ]] || fail "저장소에 미커밋 변경이 있어요. 변경을 검토·커밋한 후 실행해 주세요."
branch="$(git branch --show-current)"
[[ -n "$branch" && "$branch" != main ]] || fail "main이 아닌 작업 브랜치에서 실행해 주세요."
head_sha="$(git rev-parse HEAD)"
git fetch origin main
if [[ -n "$(git diff --name-only origin/main...HEAD -- supabase/migrations/)" ]]; then
  printf '운영 DB 마이그레이션 이력 확인 (읽기 전용)\n'
  pnpm exec supabase db push --remote --dry-run --skip-vault --output-format json | node scripts/check-applied-migrations.mjs
fi
printf '배포 대상: %s / %s / %s\n' "$repo" "$branch" "$head_sha"

printf '\n[1/5] 로컬 검사\n'
pnpm lint
pnpm typecheck
pnpm test:validation
pnpm test:weekly
pnpm test:photos
pnpm test:content
node tests/deploy.mjs
pnpm build

printf '\n[2/5] 브랜치 push · PR 준비\n'
git push -u origin "$branch"
pr_number="$(gh pr list --repo "$repo" --base main --head "$branch" --state open --json number --jq '.[0].number // empty')"
if [[ -z "$pr_number" ]]; then
  pr_number="$(gh pr list --repo "$repo" --base main --head "$branch" --state merged --json number,headRefOid --jq "map(select(.headRefOid == \"$head_sha\")) | .[0].number // empty")"
fi
if [[ -z "$pr_number" ]]; then
  title="feat: publish weekly workspace and Supabase content storage"
  [[ -n "$(git rev-list --max-count=1 origin/main..HEAD)" ]] || fail "main에 반영할 새 커밋이 없어요."
  pr_body="$(mktemp "${TMPDIR:-/tmp}/hummunication-pr.XXXXXX")"
  trap 'rm -f "${pr_body:-}"' EXIT
  cat > "$pr_body" <<BODY
주보를 작성하고 저장하면 설교·순별 새가족 문답·파송자 원본을 Supabase에서 다시 불러옵니다.

- families와 senders 배열을 프론트·서버·DB의 같은 필드로 연결합니다.
- 원본 이관, 소프트 삭제, 사진 참조 보호와 전체 저장 트랜잭션을 적용합니다.
- 공개 홈 진입과 단계 전환, 브라우저 입력 복구를 함께 반영합니다.
- 동시에 수정하면 마지막 저장 내용을 반영합니다.

포함 커밋:
$(git log --reverse --format='- %s' origin/main..HEAD)

검증: pnpm lint, pnpm typecheck, pnpm test:validation, pnpm test:weekly, pnpm test:photos, pnpm test:content, node tests/deploy.mjs, pnpm build 통과.
작업 브랜치: $branch
대상 커밋: $head_sha
포함된 DB 마이그레이션은 운영 적용 이력을 읽기 전용으로 확인했습니다.
실제 팀원 계정의 브라우저 저장·사진 업로드 성공 경로는 별도 확인이 필요합니다.
BODY
  gh pr create --repo "$repo" --base main --head "$branch" --title "$title" --body-file "$pr_body"
  pr_number="$(gh pr view "$branch" --repo "$repo" --json number --jq .number)"
fi
gh pr view "$pr_number" --repo "$repo" --json url --jq .url

if [[ "$(gh pr view "$pr_number" --repo "$repo" --json state --jq .state)" != MERGED ]]; then
  printf '\n[3/5] ci · gitleaks 및 PR 검사 대기\n'
  registered=false
  for ((attempt=1; attempt<=60; attempt++)); do
    if [[ "$(gh pr view "$pr_number" --repo "$repo" --json statusCheckRollup --jq '[.statusCheckRollup[]? | .name // .context] | contains(["ci", "gitleaks"])')" == true ]]; then
      registered=true
      break
    fi
    sleep 5
  done
  [[ "$registered" == true ]] || fail "ci · gitleaks가 등록되지 않았어요. PR의 Actions 상태를 확인해 주세요."
  gh pr checks "$pr_number" --repo "$repo" --watch --interval 10 --fail-fast
  [[ "$(gh pr checks "$pr_number" --repo "$repo" --json name,bucket --jq '[.[] | select((.name == "ci" or .name == "gitleaks") and .bucket == "pass") | .name] | unique | length == 2')" == true ]] || fail "ci · gitleaks가 모두 성공해야 병합할 수 있어요."
  printf '\n[4/5] 검사한 커밋을 main PR로 병합\n'
  gh pr merge "$pr_number" --repo "$repo" --merge --match-head-commit "$head_sha"
else
  printf '\n[3/5 · 4/5] 이미 병합된 PR이에요. 배포 상태를 이어서 확인해요.\n'
fi

printf '\n[5/5] Vercel 운영 배포 확인 (최대 10분)\n'
merge_sha="$(gh pr view "$pr_number" --repo "$repo" --json mergeCommit --jq .mergeCommit.oid)"
for ((attempt=1; attempt<=60; attempt++)); do
  deployment="$(gh api "repos/$repo/commits/$merge_sha/status" --jq '[.statuses[] | select(.context == "Vercel")][0] | [(.state // "pending"), (.target_url // "")] | @tsv')"
  state="${deployment%%$'\t'*}"
  deployment_url="${deployment#*$'\t'}"
  case "$state" in
    success) printf '배포 완료: %s\nVercel: %s\n' "$production_url" "$deployment_url"; exit 0 ;;
    failure|error) fail "Vercel 배포가 실패했어요: $deployment_url" ;;
  esac
  printf 'Vercel 배포 대기 중 (%s/60)\n' "$attempt"
  sleep 10
done
fail "PR 병합은 완료됐지만 배포가 아직 끝나지 않았어요. 같은 스크립트를 다시 실행하면 확인을 이어갑니다."
