"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/features/errors/components/error-screen";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <ErrorScreen
      code="500"
      title="문제가 생겼어요"
      body="페이지를 그리는 중에 오류가 났어요. 잠시 후 다시 시도해 주세요."
      action={<Button onClick={retry} className="h-11 rounded-full px-6"><RotateCw />다시 시도</Button>}
    />
  );
}
