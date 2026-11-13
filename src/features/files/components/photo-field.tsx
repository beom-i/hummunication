"use client";

import { useRef, useState } from "react";
import { Crop, ImagePlus, Trash2 } from "lucide-react";
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
  return <div className="w-full min-w-0">
    <input ref={node => { input.current = node; inputRef?.(node); }} id={id} type="file" accept="image/png,image/jpeg,image/webp" aria-label={`${label} 올리기`} onChange={choose} className="sr-only" />
    {value.source ? <>
      <button type="button" aria-label={`${label} 편집`} onBlur={onBlur} onClick={() => setCandidate(value)} style={{ aspectRatio: aspect }} className="relative block w-full overflow-hidden rounded-2xl border bg-muted outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"><CroppedPhoto source={value.source} edit={value.edit} aspect={aspect} label={label} className="absolute inset-0 size-full" /><span className="absolute right-3 bottom-3 rounded-full bg-card/95 px-3 py-1 text-xs font-semibold text-secondary-foreground">사진을 눌러 편집</span></button>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button type="button" variant="outline" className="h-10 gap-1.5 rounded-xl px-2 font-semibold" onClick={() => setCandidate(value)}><Crop className="size-4" />편집</Button>
        <Button type="button" variant="outline" loading={reading} disabled={reading} className="h-10 gap-1.5 rounded-xl px-2 font-semibold" onClick={() => input.current?.click()}><ImagePlus className="size-4" />교체</Button>
        <Button type="button" variant="destructive" className="h-10 gap-1.5 rounded-xl px-2 font-semibold" onClick={() => onChange({ source: "", fileId: null, edit: null })}><Trash2 className="size-4" />삭제</Button>
      </div>
    </> : <Button type="button" variant="outline" loading={reading} disabled={reading} onBlur={onBlur} style={{ aspectRatio: aspect }} className="flex h-auto w-full flex-col gap-2 rounded-2xl border-dashed bg-muted p-5" onClick={() => input.current?.click()}><span className="flex size-11 items-center justify-center rounded-full bg-card"><ImagePlus className="size-5" /></span><span className="text-base font-semibold">사진 올리기</span><span className="text-xs font-normal text-muted-foreground">PNG · JPG · WebP / 최대 5MB</span></Button>}
    {candidate && <PhotoCropDialog title={label} source={candidate.source} edit={candidate.edit} aspect={aspect} onApply={edit => { onChange({ ...candidate, edit }); onBlur?.(); }} onClose={() => setCandidate(null)} />}
  </div>;
}
