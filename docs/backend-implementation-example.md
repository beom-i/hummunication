# Feature 기반 백엔드 구현 예시

2026-11-12 · v0.6. 현재 [DB 설계](weekly-data-model.md)에 맞춘 제안이다. **sermon.bible은 성경 구절, sermon.content는 Tiptap 정리 문서**다. 삭제는 deleted_at을 기록한다. 아래 코드는 폴더와 책임을 검토하기 위한 예시이며 앱 코드·실행할 migration을 추가한 것이 아니다.

[폴더·코드 템플릿 HTML 보고서](reports/backend-code-structure.html)에서 저장·조회·삭제·폼 오류 연결 예시를 파일별로 볼 수 있다.

## 폴더와 책임

```text
src/
  features/
    weekly/
      schemas.ts        발행일·출력 선택·연결·전체 저장 계약
      queries.ts        주보 목록·연결 원본 조회
      actions.ts        saveWeekly / deleteWeekly
    sermon/
      schemas.ts        입력 검증·입력 타입·화면에 반환할 타입
      queries.ts        getSermon / listSermon
      actions.ts        saveSermon / deleteSermon
    family/             문답 묶음도 같은 구조
    files/              업로드·사진 연결·소프트 삭제
    # sender/           실제 입력 필드 확정 후 추가
  lib/
    result.ts           공통 성공·오류 계약
    supabase/
      server.ts         기존 요청별 서버 클라이언트
      client.ts         기존 브라우저 Auth 클라이언트
      database.types.ts Supabase에서 생성한 DB·RPC 타입
supabase/
  migrations/           테이블·제약·RLS·grant·DB 함수
```

웹 화면의 조회는 서버에서 queries를 호출한다. 변경은 Server Action을 호출한다. action이 인증·입력 검증·오류 변환·화면 갱신을 담당하고, DB 함수는 버전 비교·참조 보호·변경을 한 트랜잭션으로 처리한다. 복잡한 저장도 이 구조를 따른다. 기존 UI 폴더를 한 번에 옮기지 않는다. service/repository 클래스, 별도 HTTP 서버, 범용 CRUD 기반 클래스는 현재 추가하지 않는다.

## 예시: 설교 삭제 요청부터 다시 조회하기까지

```text
삭제 버튼
  → deleteSermon({ id, version })
    → Zod 검증 + getClaims 사용자 확인
      → DB delete_sermon RPC
        → 연결 확인 + version 확인 + deleted_at 기록
    → Result 반환 + 관련 화면 갱신
  → getSermon(id)는 NOT_FOUND 반환
```

도메인 이름은 sermon으로 통일한다. TS 함수는 deleteSermon, DB 함수는 delete_sermon이다. 지금 웹에서는 Server Action을 사용하므로 같은 기능의 /api/sermon 경로를 별도로 만들지 않는다. /home · /weekly · /bulletins 화면 URL은 유지한다.

### 공통 반환 계약 — src/lib/result.ts

```ts
export type ErrorCode =
  | "INVALID_INPUT" | "UNAUTHORIZED" | "FORBIDDEN"
  | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: {
      code: ErrorCode;
      message: string;
      fields?: Record<string, string[]>;
    }};
```

### 검증과 타입 — src/features/sermon/schemas.ts

```ts
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

type Row = Database["public"]["Tables"]["sermon"]["Row"];
export type Sermon = Pick<Row,
  "id" | "date" | "speaker" | "title" | "bible" | "content" | "version"
>;

export const sermonIdSchema = z.uuid();
export const deleteSermonSchema = z.object({
  id: sermonIdSchema,
  version: z.number().int().positive(),
});
export type DeleteSermonInput = z.infer<typeof deleteSermonSchema>;
```

DB 일반 컬럼은 생성 타입을 사용하고 입력 타입은 Zod에서 추론한다. content의 DB 타입은 Json이므로 저장 입력과 카드 렌더링 경계에서는 기존 richDocumentSchema로 제한된 Tiptap 문서를 검증한다. 폼이 생기면 해당 스키마·FormData 타입·DefaultValues도 이 schemas.ts에 둔다. 삭제에는 폼 기본값이 필요 없다. DB 타입 생성을 연결할 때 기존 서버 클라이언트도 createServerClient<Database>로 지정한다.

### 변경 진입점 — src/features/sermon/actions.ts

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ErrorCode, Result } from "@/lib/result";
import { deleteSermonSchema } from "./schemas";

export async function deleteSermon(
  input: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = deleteSermonSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: {
      code: "INVALID_INPUT", message: "삭제할 설교를 확인해 주세요",
    }};
  }

  const db = await createClient();
  const { data: auth, error: authError } = await db.auth.getClaims();
  if (authError || !auth?.claims?.sub) {
    return { ok: false, error: {
      code: "UNAUTHORIZED", message: "로그인해 주세요",
    }};
  }

  // DB 함수의 SQLSTATE 계약. SQL 오류 원문은 사용자에게 전달하지 않는다.
  const errors: Record<string, { code: ErrorCode; message: string }> = {
    "42501": { code: "FORBIDDEN", message: "삭제 권한을 확인해 주세요" },
    "P0002": { code: "NOT_FOUND", message: "설교를 다시 확인해 주세요" },
    "40001": { code: "CONFLICT", message: "최신 내용을 확인한 뒤 다시 시도해 주세요" },
    "23503": { code: "CONFLICT", message: "주보 연결을 먼저 해제해 주세요" },
  };
  const { error } = await db.rpc("delete_sermon", {
    p_id: parsed.data.id,
    p_version: parsed.data.version,
  });
  if (error) {
    return { ok: false, error: errors[error.code] ?? {
      code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요",
    }};
  }

  revalidatePath("/home");
  revalidatePath("/weekly");
  revalidatePath("/bulletins");
  return { ok: true, data: { id: parsed.data.id } };
}
```

RPC는 성공 시 void를 반환하고 예상 실패는 정해진 SQLSTATE로 반환하는 계약이다. 예시의 오류 코드는 해당 함수를 구현할 때 명시적으로 맞춘다. DB가 직렬화 충돌로 40001을 반환해도 사용자가 최신 상태를 다시 확인하는 동일한 CONFLICT 동작이다. 네트워크 예외 등 예상 밖 실패는 Next.js 오류 경로로 처리하며 성공으로 바꾸지 않는다. UI는 실패 시 기존 화면·입력을 유지하고, 성공 시 서버 목록을 갱신한다. 현재 localStorage 목록도 서버 조회로 교체해야 하며 revalidatePath만으로 로컬 목업 데이터가 바뀌지는 않는다.

### 서버 조회 — src/features/sermon/queries.ts

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";
import { sermonIdSchema, type Sermon } from "./schemas";

export async function getSermon(id: string): Promise<Result<Sermon>> {
  const parsed = sermonIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: {
    code: "INVALID_INPUT", message: "설교를 확인해 주세요",
  }};

  const db = await createClient();
  const { data: auth, error: authError } = await db.auth.getClaims();
  if (authError || !auth?.claims?.sub) return { ok: false, error: {
    code: "UNAUTHORIZED", message: "로그인해 주세요",
  }};

  const { data, error } = await db.from("sermon")
    .select("id,date,speaker,title,bible,content,version")
    .eq("id", parsed.data)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { ok: false, error: {
    code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요",
  }};
  if (!data) return { ok: false, error: {
    code: "NOT_FOUND", message: "설교를 다시 확인해 주세요",
  }};
  return { ok: true, data };
}
```

이 예시는 관리자 발급 팀원 계정의 콘텐츠 조회다. 화면 공개 진입은 유지한다. 비로그인 사용자가 실제 DB 원본의 어느 범위를 읽는지는 별도 정책이며, 원본 조회 함수를 무조건 공개하지 않는다. 필요해지면 공개 DTO의 필드·권한을 명시한 조회를 따로 만든다.

### DB 레이어 — migration에서 구현할 delete_sermon 계약

이 부분은 **구현해야 할 명세**다. 완성된 SQL이나 이미 존재하는 RPC가 아니다.

1. authenticated 역할만 실행할 수 있고 함수 안에서도 auth.uid()를 확인한다. 입력 p_id/p_version을 검사한다.
2. 대상 sermon 행을 잠근다. 없거나 deleted_at이 있으면 P0002. version이 다르면 40001.
3. weekly.sermon_id가 대상 원본을 참조하면 23503. 소프트 삭제된 주보의 참조도 보존 대상이다.
4. 삭제 가능한 경우 DB 시각으로 deleted_at/updated_at, auth.uid()로 updated_by를 설정하고 version을 1 증가한다. 실제 DELETE는 하지 않는다.
5. 전체를 한 트랜잭션으로 처리한다. 연결·해제·전체 저장 함수도 같은 원본 잠금 규약을 사용하여 검사 직후 새 참조가 생기는 경합을 막는다. 여러 원본을 잠글 때는 원본 종류·ID 순서 → weekly 순서로 통일한다.

일반 Data API 쓰기를 열어 두면 이 검사를 우회할 수 있다. 테이블 SELECT에는 authenticated + deleted_at IS NULL RLS를 적용하고 명시적 SELECT grant를 준다. 테이블 INSERT/UPDATE/DELETE는 anon/authenticated에 직접 허용하지 않는다. 검증된 변경 함수만 authenticated EXECUTE를 부여하고 PUBLIC/anon EXECUTE는 revoke한다. 이 방식은 함수에 한정된 SECURITY DEFINER·빈 search_path·완전 수식 테이블명·명시적 사용자 확인을 필요로 한다. 함수 보안 설정까지 migration과 함께 검토해야 하며 Supabase secret key로 우회하지 않는다.

이 예시 외의 saveWeekly는 연결 원본 버전 확인·소프트 삭제 여부 확인·여러 행 저장을 같은 RPC 트랜잭션으로 처리한다. RLS만으로 소프트 삭제된 부모·자식 연결의 업무 정합성까지 보장되지는 않는다.

## 소프트 삭제의 공통 규칙

- weekly / sermon / family / sender / files에 deleted_at timestamptz NULL을 둔다. is_deleted 같은 중복 상태는 추가하지 않는다. sender는 실제 구축 시 적용한다.
- 목록·상세는 삭제된 원본을 제외한다. 직접 ID로 접근해도 일반 사용자에게 NOT_FOUND다. RLS에서도 삭제된 행을 숨긴다.
- 삭제된 원본은 다시 저장하거나 연결할 수 없다. 모든 변경 경로는 deleted_at IS NULL과 version을 확인한다. 삭제도 version을 증가시킨다.
- 주보 삭제는 주보만 숨긴다. FK와 설교·문답·파송자 원본은 보존하며 자동 연쇄 삭제하지 않는다. 연결된 원본 삭제는 먼저 연결 해제가 필요하다. 구성 체크 해제는 연결 해제가 아니다.
- 날짜 유일성은 활성 주보에만 적용한다. date의 일반 UNIQUE 대신 WHERE deleted_at IS NULL인 부분 UNIQUE 인덱스를 사용해 삭제한 날짜로 새 주보를 만들 수 있게 한다. FK의 UNIQUE는 삭제된 주보까지 유지하여 과거 원본 소유 관계를 보존한다. 같은 날짜 새 주보는 새 원본 ID로 만든다.
- files도 메타데이터를 숨기고 Storage 원본을 즉시 지우지 않는다. 삭제된 family를 포함한 모든 문답 참조가 남아 있으면 파일 삭제를 막는다. 기존에 발급한 signed URL의 만료 전 접근까지 deleted_at으로 취소할 수는 없으므로 삭제 이후 새 URL 발급을 막고 만료 시간으로 제한한다.
- 삭제된 기록의 보존 기간·휴지통·복원 UI·자동 물리 삭제는 이번 범위에 넣지 않는다. 향후 복원은 활성 날짜 유일성 등 제약을 다시 검사해야 한다. Auth 계정 삭제는 이 콘텐츠 소프트 삭제와 별개이며 현재 UI에 추가하지 않는다.

## TDD로 시작할 첫 흐름 (사용자 확정)

테스트할 seam은 위의 deleteSermon / getSermon 공개 interface다. 로컬 Supabase와 테스트 세션을 사용하여 같은 호출 경로로 삭제 후 조회 결과를 검증하고, 내부 함수 호출 횟수·DB 내부 행을 직접 확인하는 테스트는 두지 않는다.

첫 동작: 연결되지 않은 설교를 현재 version으로 삭제하면 성공하고 getSermon은 NOT_FOUND를 반환한다. 그다음 연결된 설교 삭제 거절, 오래된 version 충돌, 미인증 거절을 각각 한 번의 red → green 흐름으로 추가한다. 저장·조회·소프트 삭제 공개 함수와 실제 폼의 필드 오류·root·toast 연결을 사용자와 확정했다. 첫 실패 테스트부터 작성한다. 이번은 구조 예시이며 테스트 파일은 아직 작성하지 않았다.

근거: 설치된 Next.js 문서의 Mutating Data / Data Security(DAL·서버 인증), [Supabase 소프트 삭제](https://supabase.com/kb/troubleshooting/soft-deletes-with-supabase-js), [Supabase DB 함수](https://supabase.com/docs/guides/database/functions). 소프트 삭제 기본 방식은 공식 안내와 같고, 부분 UNIQUE·연결 보호·원본 보존은 이 프로젝트에 맞춘 설계다. 신규 라이브러리는 필요 없다.
