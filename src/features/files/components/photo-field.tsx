"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { photoSchema, type PhotoEdit } from "@/features/files/schemas";
import { CroppedPhoto, PhotoCropDialog } from "./photo-crop";

type PhotoValue = { source: string; fileId: string | null; edit: PhotoEdit | null };
export function PhotoField({ id, label, value, aspect, onChange, onError, onBlur, inputRef }: {
  id: string; label: string; value: PhotoValue; aspect: number;
  onChange: (value: PhotoValue) => void; onError: (message: string) => void; onBlur?: () => void; inputRef?: React.RefCallback<HTMLInputElement>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [candidate, setCandidate] = useState<PhotoValue | null>(null);
  const [reading, setReading] = useState(false);
  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const checked = photoSchema.safeParse(file);
    if (!checked.success) { onError(checked.error.issues[0].message); return; }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => { setReading(false); setCandidate({ source: String(reader.result), fileId: null, edit: null }); };
    reader.onerror = () => { setReading(false); onError("사진을 다시 올려 주세요"); };
    reader.readAsDataURL(file);
  };
  return <div className="w-full min-w-0" data-photo-field>
    <input ref={node => { input.current = node; inputRef?.(node); }} id={id} type="file" accept="image/png,image/jpeg,image/webp" aria-label={`${label} 올리기`} onChange={choose} className="sr-only" />
    {value.source ? <>
      <div className="relative">
        <button type="button" aria-label={`${label} 편집`} aria-describedby={`${id}-hint`} onBlur={onBlur} onClick={() => setCandidate(value)} style={{ aspectRatio: aspect }} className="relative block w-full overflow-hidden rounded-2xl bg-muted outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"><CroppedPhoto source={value.source} edit={value.edit} aspect={aspect} label={label} className="absolute inset-0 size-full" /></button>
        <div className="absolute top-3 right-3 flex gap-1.5">
          <Button type="button" variant="outline" aria-label={`${label} 바꾸기`} loading={reading} disabled={reading} className="h-8 gap-1 rounded-full border-0 bg-card px-3 text-sm font-bold text-foreground shadow-sm" onClick={() => input.current?.click()}><Image src="/images/weekly/508b0.svg" alt="" width={15} height={15} />바꾸기</Button>
          <Button type="button" variant="outline" size="icon" aria-label={`${label} 삭제`} className="size-8 rounded-full border-0 bg-card shadow-sm" onClick={() => { onChange({ source: "", fileId: null, edit: null }); onBlur?.(); }}><Image src="/images/weekly/cb1b2.svg" alt="" width={11} height={12} /></Button>
        </div>
      </div>
      <p id={`${id}-hint`} className="mt-2 text-xs text-muted-foreground">사진을 누르면 영역과 출력 품질을 조절할 수 있어요.</p>
    </> : <>
      <Button type="button" variant="outline" aria-describedby={`${id}-hint`} loading={reading} disabled={reading} onBlur={onBlur} style={{ aspectRatio: aspect }} className="flex h-auto w-full flex-col gap-2.5 rounded-2xl border-0 bg-muted p-5 text-muted-foreground shadow-none" onClick={() => input.current?.click()}><span className="flex size-11 items-center justify-center rounded-[22px] bg-card"><span className="relative size-[30px] overflow-hidden"><Image src="/images/weekly/a02dc.png" alt="" width={40} height={40} className="absolute -top-[5px] -left-[5px] size-10 max-w-none" /></span></span><span className="text-base font-semibold tracking-[-0.48px]">사진 올리기</span></Button>
      <p id={`${id}-hint`} className="mt-2 text-xs text-muted-foreground">PNG · JPG · WebP / 최대 5MB</p>
    </>}
    {candidate && <PhotoCropDialog title={label} source={candidate.source} edit={candidate.edit} aspect={aspect} onApply={edit => { onChange({ ...candidate, edit }); onBlur?.(); }} onClose={() => setCandidate(null)} />}
  </div>;
}
