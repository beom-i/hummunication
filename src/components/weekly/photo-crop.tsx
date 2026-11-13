"use client";

import { useEffect, useState } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, Crop, Minimize2, RotateCcw, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { photoGeometry, centeredPhotoCrop, photoCropForAspect } from "./photo-crop-geometry";
import { preparePhoto, photoSizeLabel } from "./photo-optimization";
import "./photo-crop.css";
import { photoEditorDefaultValues, photoEditorSchema, type PhotoEditorData, type PhotoEdit } from "./schemas";
import { photoEditSchema, hasPhotoAspect } from "@/features/files/schemas";
import { usePhotoSource } from "./use-photo-source";

export function CroppedPhoto({ source, edit, label, aspect = 16 / 9, ...props }: { source: string; edit?: PhotoEdit | null; label: string; aspect?: number } & React.SVGProps<SVGSVGElement>) {
  const display = usePhotoSource(source, edit?.quality);
  const w = edit?.sourceWidth ?? aspect * 100, h = edit?.sourceHeight ?? 100;
  const rotation = edit?.rotation ?? 0, crop = edit?.crop ?? { x: 0, y: 0, width: 1, height: 1 };
  const { width: rw, height: rh, transform } = photoGeometry(w, h, rotation);
  return <svg viewBox={`${crop.x * rw} ${crop.y * rh} ${crop.width * rw} ${crop.height * rh}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} {...props}><g transform={transform}><image href={display.source} data-photo-original={source} data-photo-quality={edit?.quality ?? ""} width={w} height={h} preserveAspectRatio="xMidYMid slice" /></g>{display.error && <text x={crop.x * rw + crop.width * rw / 2} y={crop.y * rh + crop.height * rh / 2} textAnchor="middle" fontSize={rw / 28} fill="currentColor">사진을 다시 확인해 주세요</text>}</svg>;
}

export function PhotoCropDialog({ source, edit, onApply, onClose, aspect = 16 / 9, title = "단체 사진" }: { source: string; edit?: PhotoEdit | null; onApply: (edit: PhotoEdit) => void; onClose: () => void; aspect?: number; title?: string }) {
  const { control, register, setValue, reset, handleSubmit, setError, clearErrors, formState: { errors } } = useForm<PhotoEditorData>({ resolver: zodResolver(photoEditorSchema), defaultValues: { ...photoEditorDefaultValues, area: edit?.crop ?? photoEditorDefaultValues.area, rotation: edit?.rotation ?? 0, optimization: edit?.quality === 0.85 ? "balanced" : edit?.quality === 0.65 ? "small" : "original" } });
  const rotation = useWatch({ control, name: "rotation" });
  const area = useWatch({ control, name: "area" });
  const optimization = useWatch({ control, name: "optimization" });
  const [original, setOriginal] = useState<{ image: HTMLImageElement; size: number } | null>(null);
  const [prepared, setPrepared] = useState<{ original: typeof original; optimization: string; photo: Awaited<ReturnType<typeof preparePhoto>> } | null>(null);
  const dimensions = original ? { width: original.image.naturalWidth, height: original.image.naturalHeight } : null;
  const optimized = prepared?.original === original && prepared?.optimization === optimization ? prepared.photo : null;
  const changed = !!(original && optimized && optimization !== "original" && optimized.size < original.size);
  const calculating = !!original && optimization !== "original" && !optimized;
  const outputSize = changed ? optimized!.size : original?.size;
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    const load = async () => {
      const response = await fetch(source);
      if (!response.ok) throw new Error("Photo unavailable");
      const blob = await response.blob();
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      const image = new window.Image();
      image.src = objectUrl;
      await image.decode();
      if (cancelled) return;
      setOriginal({ image, size: blob.size });
      if (!edit) setValue("area", centeredPhotoCrop(image.naturalWidth, image.naturalHeight, 0, aspect));
      else if (!hasPhotoAspect(edit, aspect)) setValue("area", photoCropForAspect(image.naturalWidth, image.naturalHeight, edit.rotation, edit.crop, aspect));
    };
    void load().catch(() => { if (!cancelled) setError("root", { message: "사진을 다시 올려 주세요" }); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [source, edit, aspect, setValue, setError]);
  useEffect(() => {
    if (!original || optimization === "original") return;
    let cancelled = false;
    void preparePhoto(source, optimization === "balanced" ? 0.85 : 0.65).then(photo => {
      if (!cancelled) setPrepared({ original, optimization, photo });
    }).catch(() => { if (!cancelled) setError("root", { message: "사진을 처리하지 못했어요. 원본을 선택하거나 다시 시도해 주세요" }); });
    return () => { cancelled = true; };
  }, [original, optimization, source, setError]);
  const rotate = (delta: number) => {
    const next = ((rotation + delta + 360) % 360) as PhotoEdit["rotation"];
    setValue("rotation", next);
    if (dimensions) setValue("area", centeredPhotoCrop(dimensions.width, dimensions.height, next, aspect));
  };
  const apply = () => handleSubmit(data => {
    if (!dimensions || calculating) return;
    const result = photoEditSchema.safeParse({ rotation: data.rotation, sourceWidth: dimensions.width, sourceHeight: dimensions.height, crop: data.area, quality: data.optimization === "original" ? null : data.optimization === "balanced" ? 0.85 : 0.65 });
    if (!result.success || !hasPhotoAspect(result.data, aspect)) { setError("root", { message: "크롭 영역을 다시 조정해 주세요" }); return; }
    onApply(result.data); onClose();
  })();
  const bounds = dimensions ? photoGeometry(dimensions.width, dimensions.height, rotation) : null;
  const cropEditor = <div className="photo-editor-canvas flex h-[360px] items-center justify-center overflow-hidden rounded-2xl bg-muted p-3 max-sm:h-[240px]">
    {!dimensions && <Skeleton className="size-full rounded-xl" />}
    {dimensions && bounds && <Controller control={control} name="area" render={({ field }) => <ReactCrop crop={{ unit: "%", x: field.value.x * 100, y: field.value.y * 100, width: field.value.width * 100, height: field.value.height * 100 }} aspect={aspect} keepSelection ruleOfThirds minWidth={10} ariaLabels={{ cropArea: "방향키로 선택 영역을 옮겨 주세요", nwDragHandle: "왼쪽 위 모서리 크기 조절", nDragHandle: "위쪽 크기 조절", neDragHandle: "오른쪽 위 모서리 크기 조절", eDragHandle: "오른쪽 크기 조절", seDragHandle: "오른쪽 아래 모서리 크기 조절", sDragHandle: "아래쪽 크기 조절", swDragHandle: "왼쪽 아래 모서리 크기 조절", wDragHandle: "왼쪽 크기 조절" }} onChange={(_, crop) => field.onChange({ x: crop.x / 100, y: crop.y / 100, width: crop.width / 100, height: crop.height / 100 })} className="photo-frame-crop" style={{ "--photo-ratio": bounds.width / bounds.height } as React.CSSProperties}>
      <svg viewBox={`0 0 ${bounds.width} ${bounds.height}`} width={bounds.width} height={bounds.height} className="block h-auto w-full" role="img" aria-label="편집할 사진 미리보기"><g transform={bounds.transform}><image href={changed ? optimized!.source : source} width={dimensions.width} height={dimensions.height} /></g></svg>
    </ReactCrop>} />}
  </div>;
  const rotationTools = <div className="photo-editor-rotation mt-3 flex items-center gap-2"><Button type="button" variant="outline" className="h-9 rounded-xl text-xs" disabled={!dimensions} aria-label="왼쪽으로 90도 회전" onClick={() => rotate(-90)}><RotateCcw className="size-3.5" />왼쪽 90°</Button><Button type="button" variant="outline" className="h-9 rounded-xl text-xs" disabled={!dimensions} aria-label="오른쪽으로 90도 회전" onClick={() => rotate(90)}><RotateCw className="size-3.5" />오른쪽 90°</Button><Button type="button" variant="outline" className="h-9 rounded-xl text-xs" disabled={!dimensions} onClick={() => { if (dimensions) reset({ ...photoEditorDefaultValues, area: centeredPhotoCrop(dimensions.width, dimensions.height, 0, aspect) }); }}>초기화</Button><span className="ml-auto text-xs text-muted-foreground" aria-live="polite">{rotation}°</span></div>;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="weekly-popover photo-editor-dialog max-h-[92svh] gap-0 overflow-y-auto rounded-[28px] p-0 sm:max-w-[960px] data-open:zoom-in-100 data-closed:zoom-out-100">
      <DialogHeader className="border-b px-7 py-6 text-left max-sm:px-5"><DialogTitle className="text-xl font-bold tracking-[-0.6px]">{title} 편집</DialogTitle><DialogDescription className="break-keep">사진 영역과 출력 품질을 조절해 주세요. 원본은 유지돼요.</DialogDescription></DialogHeader>
      <div className="grid grid-cols-[minmax(0,1fr)_208px] gap-6 p-7 max-md:grid-cols-1 max-sm:gap-5 max-sm:p-5">
      <div className="min-w-0"><div className="mb-3 flex items-center justify-between text-[13px]"><span className="flex items-center gap-1.5 font-semibold"><Crop className="size-4" />사진 영역</span><span className="text-xs text-muted-foreground">선택 영역을 드래그해 주세요</span></div>
      {cropEditor}
      {rotationTools}
      </div>
      <div className="min-w-0 border-l pl-6 max-md:border-t max-md:border-l-0 max-md:pt-5 max-md:pl-0">
        {dimensions && <div className="mb-5"><p className="mb-2 text-[13px] font-semibold">적용 미리보기</p><CroppedPhoto source={source} edit={{ rotation, crop: area, sourceWidth: dimensions.width, sourceHeight: dimensions.height, quality: optimization === "original" ? null : optimization === "balanced" ? 0.85 : 0.65 }} aspect={aspect} label="적용 미리보기" style={{ aspectRatio: aspect }} className="w-full overflow-hidden rounded-xl border bg-muted" /></div>}
        <Field className="gap-3"><FieldLabel className="flex items-center gap-1.5 text-[13px] font-semibold"><Minimize2 className="size-4" />출력 품질</FieldLabel><fieldset className="photo-size-options" disabled={!original}><legend className="sr-only">사진 출력 품질</legend>
          {([{ value: "original", label: "원본 유지" }, { value: "balanced", label: "권장" }, { value: "small", label: "더 작게" }] as const).map(option => <label key={option.value} className="photo-size-option"><input type="radio" value={option.value} {...register("optimization", { onChange: () => clearErrors("root") })} className="sr-only" /><span className="photo-size-radio" aria-hidden="true" /><span className="min-w-0 text-[13px] font-semibold break-keep">{option.label}</span>{option.value === "balanced" && <span className="photo-size-badge ml-auto rounded bg-home-brand/20 px-1.5 py-0.5 text-[10px] font-semibold">추천</span>}</label>)}
        </fieldset><FieldError errors={[errors.optimization]} /></Field>
        <div className="mt-6 border-t pt-5" aria-live="polite" aria-busy={calculating || !original}>
          <p className="text-xs text-muted-foreground">출력 사진 용량</p>
          {calculating || !outputSize ? <Skeleton className="my-2 h-8 w-28" /> : <p className="mt-1.5 text-[26px] leading-9 font-extrabold tracking-[-0.8px] tabular-nums">{photoSizeLabel(outputSize)}</p>}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><span>원본 {original ? photoSizeLabel(original.size) : "—"}</span>{changed && !calculating && <span className="inline-flex items-center rounded-full bg-home-brand/25 px-1.5 py-0.5 text-[11px] font-semibold text-foreground"><ArrowDown className="size-3" />{Math.round((1 - optimized!.size / original!.size) * 100)}%</span>}</div>
        </div>
        <p className="mt-3 text-[11px] leading-[18px] text-muted-foreground">{optimization === "original" ? "원본 품질로 출력해요." : optimized && !changed ? "이미 용량이 작은 사진이라 원본을 유지해요." : "긴 변을 최대 2,400px로 조정해요."}</p>
      </div></div>
      <div className="px-7 max-sm:px-5"><FieldError errors={[errors.root]} /></div>
      <DialogFooter className="sticky bottom-0 flex-row items-center justify-between border-t bg-card px-7 py-5 max-sm:px-5"><span className="mr-auto text-xs text-muted-foreground max-sm:hidden">취소하면 원래 사진이 유지돼요.</span><Button type="button" variant="outline" className="h-11 rounded-full px-5" onClick={onClose}>취소</Button><Button type="button" loading={calculating} disabled={!dimensions || calculating} className="h-11 rounded-full bg-home-brand px-6 font-bold text-foreground hover:bg-home-brand/85" onClick={() => void apply()}>편집 적용</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
