# Feature 기반 백엔드 구현

현재 코드 기준이다. [전체 DB 구조](weekly-data-model.md)와 [코드 HTML](reports/backend-code-structure.html)을 함께 확인한다.

```text
src/features/
  weekly/   schemas.ts · queries.ts · actions.ts · client.ts
  sermon/   schemas.ts · queries.ts · actions.ts
  family/   schemas.ts · actions.ts
  sender/   schemas.ts · queries.ts · actions.ts
  files/    schemas.ts · queries.ts · actions.ts
src/lib/
  result.ts · form-errors.ts · supabase/{server,client,with-user,database.types}.ts
supabase/migrations/  스키마·RLS·grant·변경 함수
```

sender는 파송자 한 사람이며 weekly_id로 주보에 연결한다. 저장 번호 비교 없이 마지막 저장을 반영한다. 모든 입력을 서버 Zod로 다시 검증하고 getClaims로 사용자 확인 후 RPC를 호출한다. 원본 조합 저장은 DB 트랜잭션 하나다.

## 설교 삭제의 실제 코드

### src/features/sermon/actions.ts

```ts
"use server";
import { revalidatePath } from "next/cache";
import { withUser } from "@/lib/supabase/with-user";
import { invalidInput, databaseFailure, type Result } from "@/lib/result";
import { saveSermonSchema, recordRefSchema } from "./schemas";
import { getSermon } from "./queries";
export async function saveSermon(input: unknown) {
  const parsed = saveSermonSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async db => {
    const { ref, values } = parsed.data;
    const { data, error } = await db.rpc("save_sermon", { p_id: ref?.id ?? undefined, p_values: { ...values, date: values.date || null } });
    if (error) return databaseFailure(error);
    revalidatePath("/bulletins");
    return getSermon(data);
  });
}
export async function deleteSermon(input: unknown): Promise<Result<null>> {
  const parsed = recordRefSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  return withUser(async db => {
    const { error } = await db.rpc("delete_sermon", { p_id: parsed.data.id });
    if (error) return databaseFailure(error);
    revalidatePath("/bulletins");
    return { ok: true, data: null };
  });
}
```

### src/features/sermon/queries.ts

```ts
import "server-only";
import { z } from "zod";
import { withUser } from "@/lib/supabase/with-user";
import { databaseFailure, invalidInput, failure, type Result } from "@/lib/result";
import { sermonSchema, type Sermon } from "./schemas";
export async function getSermon(input: unknown): Promise<Result<Sermon>> {
  const id = z.uuid().safeParse(input);
  if (!id.success) return invalidInput(id.error);
  return withUser(async db => {
    const { data, error } = await db.rpc("get_sermon", { p_id: id.data });
    if (error) return databaseFailure(error);
    if (!data || typeof data !== "object" || Array.isArray(data)) return failure("NOT_FOUND", "설교를 확인해 주세요");
    const parsed = sermonSchema.safeParse({ ...data, date: data.date ?? "", thumbnailId: data.thumbnail_id ?? null });
    return parsed.success ? { ok: true, data: parsed.data } : failure("INTERNAL_ERROR", "저장된 설교를 확인해 주세요");
  });
}
```

### src/lib/form-errors.ts

```ts
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { AppError } from "./result";

export function setFormErrors<T extends FieldValues>(form: UseFormReturn<T>, error: AppError) {
  const values = form.getValues();
  for (const [key, messages] of Object.entries(error.fields ?? {})) {
    const path = key.replace(/^values\./, "");
    let current: unknown = values;
    const known = path.split(".").every(part => {
      if (["__proto__", "prototype", "constructor"].includes(part) || !current || typeof current !== "object" || !Object.hasOwn(current, part)) return false;
      current = (current as Record<string, unknown>)[part];
      return true;
    });
    if (known && messages[0]) form.setError(path as Path<T>, { type: "server", message: messages[0] });
  }
  form.setError("root", { type: "server", message: error.message });
}
```

삭제는 deleted_at을 기록한다. 연결된 설교·문답과 참조 사진을 보호하며, 일반 조회는 활성 원본만 반환한다. UI는 공통 Result 오류를 FieldError·root·toast로 표시하고 입력을 보존한다.
