import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/features/errors/components/error-screen";

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="페이지를 찾을 수 없어요"
      body="주소가 바뀌었거나 삭제된 페이지예요. 주소를 다시 확인하거나 아래에서 이동해 주세요."
      action={<Button asChild className="h-11 rounded-full px-6"><Link href="/home">홈으로</Link></Button>}
    />
  );
}
