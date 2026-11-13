import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  navigationLabel: string;
  index: number;
  count: number;
  onNavigate: (index: number) => void;
  children: React.ReactNode;
};

export function CardPreview({ label, navigationLabel, index, count, onNavigate, children }: Props) {
  return <section className="weekly-preview-panel" aria-label={label}>
    <h2 className="mb-4 text-lg font-bold">카드뉴스 미리보기</h2>
    <div className="weekly-preview-stage px-6 py-7">
      <div className="relative px-10">
        <Button variant="outline" size="icon-lg" className="preview-nav left-0 rounded-full" aria-label={`이전 ${navigationLabel}`} disabled={index === 0} onClick={() => onNavigate(index - 1)}><ChevronLeft /></Button>
        <div className="mx-auto w-full max-w-[300px]">{children}</div>
        <Button variant="outline" size="icon-lg" className="preview-nav right-0 rounded-full" aria-label={`다음 ${navigationLabel}`} disabled={index + 1 >= count} onClick={() => onNavigate(index + 1)}><ChevronRight /></Button>
      </div>
      <p className="mx-auto mt-3 w-fit rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground" aria-live="polite">{index + 1}/{count}</p>
    </div>
  </section>;
}
