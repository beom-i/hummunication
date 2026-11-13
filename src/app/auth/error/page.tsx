import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const { error, reason } = await searchParams;
  if (reason === "invalid-link") return <p className="text-sm text-muted-foreground">로그인 링크가 만료되었거나 올바르지 않아요. 링크를 다시 확인해 주세요.</p>;
  return (
    <p className="text-sm text-muted-foreground">
      {error ? `오류: ${error}` : "알 수 없는 오류가 발생했습니다."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">문제가 발생했습니다</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <ErrorContent searchParams={searchParams} />
            </Suspense>
            <Button asChild variant="outline" className="mt-5"><Link href="/auth/login">로그인으로 돌아가기</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
