# hummunication

Next.js (App Router) · TypeScript · shadcn/ui · Supabase · Vercel

코드 배치와 의존성 원칙은 [구조 안내](docs/architecture.md)를 참고한다.

## 로컬 실행

```bash
pnpm install
cp .env.example .env.local   # Supabase 대시보드 → Project Settings → API Keys 값 입력
pnpm dev
```

로컬 Supabase(Docker)로 개발하려면 `pnpm supabase start` 후 출력되는 URL/Publishable key를 `.env.local`에 넣는다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | 라우트 타입 생성 + `tsc --noEmit` |
| `pnpm supabase <cmd>` | Supabase CLI (프로젝트 고정 버전) |

## 배포

변경을 작업 브랜치에 커밋한 후 `bash scripts/deploy.sh`를 실행한다. GitHub CLI(`gh auth login`)와 pnpm이 필요하다.

로컬 검사 → 브랜치 push → PR 생성 또는 재사용 → ci·gitleaks 및 PR 검사 통과 → main 병합 → Vercel 배포 성공 확인 순서로 실행한다. 검사 실패 시 병합하지 않으며 DB 마이그레이션이 포함된 변경은 별도 운영 반영 확인을 위해 중단한다. 이미 병합된 같은 커밋은 배포 확인부터 이어간다.

스크립트 제어 흐름은 `python3 scripts/check-deploy.py`로 실제 원격 작업 없이 검증할 수 있다.

## 인증

`/`, `/home`, `/weekly`, `/bulletins` 등 서비스 화면은 발급받은 팀원 계정으로 로그인해야 사용할 수 있다. 서버에서 검증한 JWT가 없거나 만료되면 원래 이동할 주소를 보존해 로그인 화면으로 보내고 안내 토스트를 표시한다. API는 인증·권한 오류를 401/403과 공통 오류 형식으로 반환하며, 서버 액션은 `withUser`에서 다시 검증한다. 입력 초안은 브라우저에 보관하고 저장·사진 업로드는 Supabase에 반영한다. 팀·카드뉴스 메뉴는 개발 중 안내를 표시한다.

사이드바 프로필에 마우스를 올리거나 클릭하면 위쪽 계정 메뉴에서 로그아웃할 수 있다. 클릭·키보드·모바일 터치를 지원한다. 로그아웃이 실패하면 화면과 세션을 유지하고 오류를 표시한다.

공개 회원가입 없음. 계정은 admin이 Supabase 대시보드(Authentication → Users)에서 발급한다.
기존 인증 화면과 `/protected`의 로그인 검증은 유지한다.

## 기여 규칙

[AGENTS.md](./AGENTS.md) 참고. 비밀값은 절대 커밋하지 않는다.
