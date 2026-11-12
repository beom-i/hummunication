import { createAdminClient } from "@/lib/supabase/admin";
import { cleanupPhotos } from "@/features/files/cleanup";
import { failure } from "@/lib/result";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json(failure("UNAUTHORIZED", "접근 권한을 확인해 주세요"), { status: 401 });
  }
  if (!process.env.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return Response.json(failure("INTERNAL_ERROR", "파일 정리 설정을 확인해 주세요"), { status: 503 });
  }
  try {
    const result = await cleanupPhotos(createAdminClient());
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch {
    return Response.json(failure("INTERNAL_ERROR", "파일 정리를 다시 시도해 주세요"), { status: 500 });
  }
}
