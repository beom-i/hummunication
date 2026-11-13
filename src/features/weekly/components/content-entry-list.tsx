"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSidebar } from "@/components/ui/sidebar";
import { CroppedPhoto } from "@/features/files/components/photo-crop";
import type { PhotoEdit } from "@/features/files/schemas";

export function ContentEntryList({ entries, kind, onEdit, onAdd, onRemove }: {
  entries: { id: string; name: string; photo?: string; photoEdit?: PhotoEdit | null }[];
  kind: "순" | "파송자"; onEdit: (index: number) => void; onAdd: () => void; onRemove: (index: number) => void;
}) {
  const { state, isMobile } = useSidebar();
  const [removing, setRemoving] = useState<string | null>(null);
  const index = entries.findIndex(entry => entry.id === removing);
  return <section className="mx-auto mt-[60px] flex w-full max-w-[438px] flex-col items-center gap-5 max-sm:px-5" aria-label={`${kind} 목록`}>
    {entries.map((entry, index) => <article key={entry.id} className="weekly-enter w-full rounded-[30px] border bg-card p-[15px]">
      <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-[16px] border bg-muted">
        {entry.photo ? <CroppedPhoto source={entry.photo} edit={entry.photoEdit} label={`${entry.name} 단체 사진`} className="absolute inset-0 size-full" /> : <Image src="/images/weekly/8b670.png" alt="" width={164} height={164} />}
      </div>
      <div className="mt-5 mb-1 flex items-center gap-[14px] px-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-base font-bold text-home-brand">{index + 1}</span>
        <h2 className="min-w-0 flex-1 truncate text-xl font-bold tracking-[-0.4px]">{entry.name || "미입력"}</h2>
        <div className="flex gap-1"><Button variant="secondary" size="icon" onClick={() => setRemoving(entry.id)} aria-label={`${entry.name || `미입력 ${kind}`} 삭제`} className="weekly-entry-action size-[38px] rounded-full"><Image src="/images/weekly/d757a.svg" alt="" width={12.5794} height={13.2706} /></Button><Button variant="secondary" onClick={() => onEdit(index)} aria-label={`${entry.name || `미입력 ${kind}`} 편집`} className="weekly-entry-action h-[38px] gap-1 rounded-full px-4 text-base font-bold tracking-[-0.48px]"><Image src="/images/weekly/e0615.svg" alt="" width={18} height={18} />편집</Button></div>
      </div>
    </article>)}
    <Button variant="outline" disabled={entries.length >= 20} className="h-[59px] gap-[14px] rounded-full border-dashed bg-card px-[27px] text-xl font-bold active:translate-y-0" onClick={onAdd}>{kind} 추가하기<Image src="/images/weekly/ebecb.svg" alt="" width={24} height={24} /></Button>
    <Dialog open={index >= 0} onOpenChange={open => { if (!open) setRemoving(null); }}>
      <DialogContent showCloseButton={false} style={{ left: isMobile ? "50%" : `calc(50% + ${state === "collapsed" ? 32 : 128}px)` }} className="weekly-popover weekly-delete-dialog sm:max-w-[420px] gap-7 rounded-[30px] p-7">
        <DialogHeader className="text-left"><DialogTitle className="text-2xl font-bold tracking-[-0.72px]">{index >= 0 ? entries[index].name || `이 ${kind}` : ""}{kind === "순" ? "을" : "를"} 삭제할까요?</DialogTitle><DialogDescription className="text-base leading-6">입력한 답변과 사진이 함께 지워지고<br />되돌릴 수 없어요.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-2"><Button variant="secondary" size="workflow" onClick={() => setRemoving(null)}>취소</Button><Button size="workflow" onClick={() => { if (index >= 0) onRemove(index); setRemoving(null); }}>삭제하기</Button></div>
      </DialogContent>
    </Dialog>
  </section>;
}
