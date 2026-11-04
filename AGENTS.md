<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# hummunication — 에이전트 작업 규칙

이 repo는 **public**이다. 커밋되는 모든 것은 전 세계에 공개된다고 가정한다.

## 스택
- Next.js (App Router, `src/`) · React · TypeScript strict · pnpm
- UI: shadcn/ui (Radix) + Tailwind v4. 디자인 토큰은 `src/app/globals.css`, 디자인 원본은 Figma
- Supabase: Auth(이메일+비밀번호, **admin이 계정 발급 — 공개 회원가입 없음**), Storage(private 버킷)
- 배포: GitHub → Vercel

## 절대 하지 말 것
- **비밀값**: `.env*` 파일(`.env.example` 제외)을 읽기·출력·커밋 금지. 키/토큰/비밀번호를 코드, 로그, 커밋 메시지, PR, 이슈, 테스트 픽스처에 쓰지 않는다. 값이 필요하면 사용자에게 `.env.local`에 직접 넣어 달라고 요청한다.
- **클라이언트 노출**: secret 값에 `NEXT_PUBLIC_` 접두사 금지. `SUPABASE_SECRET_KEY`를 쓰는 모듈은 첫 줄에 `import "server-only"`.
- **공개 회원가입 경로 추가 금지**: sign-up 페이지나 `auth.signUp()` 호출을 만들지 않는다. 계정 생성은 admin 전용 서버 코드에서만.
- **DB/Storage**: RLS 없는 테이블·버킷 생성 금지. 스키마/정책 변경은 `supabase/migrations/` 파일로만. 원격 DB에 영향 주는 명령(`supabase db push`, `db reset --linked` 등)은 사용자 확인 후.
- **마이그레이션 = 운영 반영**: Supabase GitHub 연동으로 `main`에 머지된 `supabase/migrations/`는 운영 DB에 자동 적용된다. 이미 머지된 마이그레이션 파일은 수정·삭제하지 않고 새 파일로 고친다.
- **새 테이블**: 프로젝트가 "새 테이블 자동 노출" OFF라서 테이블 생성 시 같은 마이그레이션에 RLS 정책 + 필요한 역할(`authenticated` 등)에 대한 명시적 `grant`를 함께 쓴다. `anon`에는 꼭 필요할 때만.
- **Git/배포**: `main`은 보호 브랜치다. 항상 새 브랜치 → PR로 작업한다. 원격 push, force push, `vercel --prod`는 먼저 묻는다. 히스토리 재작성 금지. PR의 `ci`·`gitleaks` 검사를 우회하거나 끄지 않는다.
- **개인정보**: 실제 사람의 이메일·이름·연락처를 예시/테스트 데이터로 쓰지 않는다. `example.com` 도메인 사용.

## 지켜야 할 것
- 의존성 추가 시 이유를 밝히고, 같은 역할의 라이브러리를 중복 설치하지 않는다.
- **폼**: react-hook-form + zod(`zodResolver`) + shadcn `Field` 컴포넌트(`Controller`로 연결). `useState`로 폼 상태를 직접 관리하지 않는다. 서버 오류는 `form.setError("root", …)`. 예시: `src/components/auth/login-form.tsx`
- **검증**: 서버(Server Action·Route Handler)로 들어오는 입력도 zod로 다시 검증한다. 클라이언트 검증만 믿지 않는다.
- 스타일은 토큰(`bg-primary` 등)과 `src/components/ui/*`의 variant로 처리. 페이지에 색상 하드코딩 금지.
- `src/components/ui/*`는 shadcn이 생성한 우리 코드다. 수정은 디자인 시스템 차원의 변경일 때만.
- 서버에서 사용자 확인은 `supabase.auth.getClaims()`로 한다. 클라이언트가 보낸 user id를 신뢰하지 않는다.
- 커밋 전: `pnpm lint && pnpm typecheck && pnpm build` 통과, `git diff --cached`에 비밀값이 없는지 확인.
