"use client";

import { useEffect, useState } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { photoGeometry, centeredPhotoCrop } from "./photo-crop-geometry";
import "./photo-crop.css";
import { cropDefaultValues, cropFormSchema, photoEditSchema, type CropFormData, type PhotoEdit } from "./schemas";

export function CroppedPhoto({ source, edit, label, ...props }: { source: string; edit?: PhotoEdit | null; label: string } & React.SVGProps<SVGSVGElement>) {
  if (!edit) return <svg viewBox="0 0 238 142" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} {...props}><image href={source} width="238" height="142" preserveAspectRatio="xMidYMid slice" /></svg>;
  const { sourceWidth: w, sourceHeight: h, rotation, crop } = edit;
  const { width: rw, height: rh, transform } = photoGeometry(w, h, rotation);
  return <svg viewBox={`${crop.x * rw} ${crop.y * rh} ${crop.width * rw} ${crop.height * rh}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} {...props}><g transform={transform}><image href={source} width={w} height={h} /></g></svg>;
}

export function PhotoCropDialog({ source, edit, onApply, onClose }: { source: string; edit?: PhotoEdit | null; onApply: (edit: PhotoEdit) => void; onClose: () => void }) {
  const { control, setValue, handleSubmit, setError, formState: { errors } } = useForm<CropFormData>({ resolver: zodResolver(cropFormSchema), defaultValues: { ...cropDefaultValues, area: edit?.crop ?? cropDefaultValues.area, rotation: edit?.rotation ?? 0 } });
  const rotation = useWatch({ control, name: "rotation" });
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const image = new window.Image();
    image.src = source;
    image.decode().then(() => {
      if (cancelled) return;
      setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
      if (!edit) setValue("area", centeredPhotoCrop(image.naturalWidth, image.naturalHeight, 0));
    }).catch(() => { if (!cancelled) setError("root", { message: "사진을 다시 올려 주세요" }); });
    return () => { cancelled = true; };
  }, [source, edit, setValue, setError]);
  const rotate = (delta: number) => {
    const next = ((rotation + delta + 360) % 360) as PhotoEdit["rotation"];
    setValue("rotation", next);
    if (dimensions) setValue("area", centeredPhotoCrop(dimensions.width, dimensions.height, next));
  };
  const apply = () => handleSubmit(data => {
    if (!dimensions) return;
    const result = photoEditSchema.safeParse({ rotation: data.rotation, sourceWidth: dimensions.width, sourceHeight: dimensions.height, crop: data.area });
    if (!result.success) { setError("root", { message: "크롭 영역을 다시 조정해 주세요" }); return; }
    onApply(result.data); onClose();
  })();
  const bounds = dimensions ? photoGeometry(dimensions.width, dimensions.height, rotation) : null;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="weekly-popover max-h-[90svh] overflow-y-auto sm:max-w-[640px] data-open:zoom-in-100 data-closed:zoom-out-100">
      <DialogHeader><DialogTitle>단체 사진 편집</DialogTitle><DialogDescription>선택 영역을 옮기거나 모서리를 드래그해 크기를 조절해 주세요.</DialogDescription></DialogHeader>
      <div className="flex h-[360px] items-center justify-center overflow-hidden rounded-2xl bg-muted p-3 max-sm:h-[300px]">
        {dimensions && bounds && <Controller control={control} name="area" render={({ field }) => <ReactCrop crop={{ unit: "%", x: field.value.x * 100, y: field.value.y * 100, width: field.value.width * 100, height: field.value.height * 100 }} aspect={119 / 71} keepSelection ruleOfThirds minWidth={10} ariaLabels={{ cropArea: "방향키로 선택 영역을 옮겨 주세요", nwDragHandle: "왼쪽 위 모서리 크기 조절", nDragHandle: "위쪽 크기 조절", neDragHandle: "오른쪽 위 모서리 크기 조절", eDragHandle: "오른쪽 크기 조절", seDragHandle: "오른쪽 아래 모서리 크기 조절", sDragHandle: "아래쪽 크기 조절", swDragHandle: "왼쪽 아래 모서리 크기 조절", wDragHandle: "왼쪽 크기 조절" }} onChange={(_, crop) => field.onChange({ x: crop.x / 100, y: crop.y / 100, width: crop.width / 100, height: crop.height / 100 })} className="photo-frame-crop" style={{ "--photo-ratio": bounds.width / bounds.height } as React.CSSProperties}>
          <svg viewBox={`0 0 ${bounds.width} ${bounds.height}`} width={bounds.width} height={bounds.height} className="block h-auto w-full" role="img" aria-label="크롭할 원본 사진"><g transform={bounds.transform}><image href={source} width={dimensions.width} height={dimensions.height} /></g></svg>
        </ReactCrop>} />}
      </div>
      <div className="flex items-center gap-3"><Button type="button" variant="outline" disabled={!dimensions} aria-label="왼쪽으로 90도 회전" onClick={() => rotate(-90)}><RotateCcw className="size-4" />90°</Button><Button type="button" variant="outline" disabled={!dimensions} aria-label="오른쪽으로 90도 회전" onClick={() => rotate(90)}><RotateCw className="size-4" />90°</Button><span className="ml-auto text-sm text-muted-foreground" aria-live="polite">{rotation}°</span></div>
      <FieldError errors={[errors.root]} />
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>취소</Button><Button type="button" disabled={!dimensions} onClick={() => void apply()}>적용</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
