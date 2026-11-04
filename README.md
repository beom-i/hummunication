# hummunication

Next.js (App Router) · TypeScript · shadcn/ui · Supabase · Vercel

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

## 인증

공개 회원가입 없음. 계정은 admin이 Supabase 대시보드(Authentication → Users)에서 발급한다.

## 기여 규칙

[AGENTS.md](./AGENTS.md) 참고. 비밀값은 절대 커밋하지 않는다.
