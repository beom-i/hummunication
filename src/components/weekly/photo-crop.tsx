"use client";

import { useMemo, useRef } from "react";
import Cropper, { type Area, type MediaSize } from "react-easy-crop";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { cropDefaultValues, cropFormSchema, photoEditSchema, type CropFormData, type PhotoEdit } from "./schemas";

export function CroppedPhoto({ source, edit, label, ...props }: { source: string; edit?: PhotoEdit; label: string } & React.SVGProps<SVGSVGElement>) {
  if (!edit) return <svg viewBox="0 0 238 142" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} {...props}><image href={source} width="238" height="142" preserveAspectRatio="xMidYMid slice" /></svg>;
  const { sourceWidth: w, sourceHeight: h, rotation, crop } = edit;
  const rw = rotation % 180 ? h : w, rh = rotation % 180 ? w : h;
  const transform = rotation === 90 ? `translate(${h} 0) rotate(90)` : rotation === 180 ? `translate(${w} ${h}) rotate(180)` : rotation === 270 ? `translate(0 ${w}) rotate(270)` : undefined;
  return <svg viewBox={`${crop.x * rw} ${crop.y * rh} ${crop.width * rw} ${crop.height * rh}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} {...props}><g transform={transform}><image href={source} width={w} height={h} /></g></svg>;
}

export function PhotoCropDialog({ source, edit, onApply, onClose }: { source: string; edit?: PhotoEdit; onApply: (edit: PhotoEdit) => void; onClose: () => void }) {
  const { control, register, setValue, handleSubmit, setError, formState: { errors } } = useForm<CropFormData>({ resolver: zodResolver(cropFormSchema), defaultValues: { ...cropDefaultValues, rotation: edit?.rotation ?? 0 } });
  const rotation = useWatch({ control, name: "rotation" });
  const zoom = useWatch({ control, name: "zoom" });
  const area = useRef<Area | null>(null);
  const media = useRef<MediaSize | null>(null);
  const initialArea = useMemo(() => edit && rotation === edit.rotation ? { x: edit.crop.x * 100, y: edit.crop.y * 100, width: edit.crop.width * 100, height: edit.crop.height * 100 } : undefined, [edit, rotation]);
  const rotate = (delta: number) => {
    area.current = null;
    setValue("rotation", ((rotation + delta + 360) % 360) as PhotoEdit["rotation"]);
    setValue("position", { x: 0, y: 0 }); setValue("zoom", 1);
  };
  const apply = () => handleSubmit(data => {
    if (!area.current || !media.current) { setError("root", { message: "사진을 불러온 후 다시 시도해 주세요" }); return; }
    const { naturalWidth: sourceWidth, naturalHeight: sourceHeight } = media.current;
    const a = area.current;
    const result = photoEditSchema.safeParse({ rotation: data.rotation, sourceWidth, sourceHeight, crop: { x: a.x / 100, y: a.y / 100, width: a.width / 100, height: a.height / 100 } });
    if (!result.success) { setError("root", { message: "크롭 영역을 다시 조정해 주세요" }); return; }
    onApply(result.data); onClose();
  })();
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="weekly-popover max-h-[90svh] overflow-y-auto sm:max-w-[640px] data-open:zoom-in-100 data-closed:zoom-out-100">
      <DialogHeader><DialogTitle>단체 사진 편집</DialogTitle><DialogDescription>사진을 움직여 위치를 맞춰 주세요. 카드뉴스와 같은 비율로 잘라요.</DialogDescription></DialogHeader>
      <div className="relative h-[330px] overflow-hidden rounded-2xl bg-primary max-sm:h-[260px]">
        <Controller control={control} name="position" render={({ field }) => <Cropper image={source} crop={field.value} zoom={zoom} rotation={rotation} aspect={119 / 71} maxZoom={5} initialCroppedAreaPercentages={initialArea} onCropChange={field.onChange} onZoomChange={value => setValue("zoom", value)} onCropComplete={value => { area.current = value; }} onMediaLoaded={value => { media.current = value; }} mediaProps={{ onError: () => setError("root", { message: "사진을 다시 올려 주세요" }) }} />} />
      </div>
      <div className="flex items-center gap-3"><Button type="button" variant="outline" aria-label="왼쪽으로 90도 회전" onClick={() => rotate(-90)}><RotateCcw className="size-4" />90°</Button><Button type="button" variant="outline" aria-label="오른쪽으로 90도 회전" onClick={() => rotate(90)}><RotateCw className="size-4" />90°</Button><span className="ml-auto text-sm text-muted-foreground" aria-live="polite">{rotation}°</span></div>
      <Field><FieldLabel htmlFor="photo-zoom">확대·축소</FieldLabel><input id="photo-zoom" type="range" min="1" max="5" step="0.01" {...register("zoom", { valueAsNumber: true })} className="w-full accent-primary" /></Field>
      <FieldError errors={[errors.root]} />
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>취소</Button><Button type="button" onClick={() => void apply()}>적용</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
