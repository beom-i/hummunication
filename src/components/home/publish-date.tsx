"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { publishDateDefaultValues, publishDateSchema, type PublishDateFormData } from "./schemas";

const draftKey = "hummunication.publish-date-draft";
// shortcut: Figma의 고정 날짜를 사용하며, 실제 발행 연결 시 주일 목록으로 교체한다.
const publishDates = [
  { value: "2026-11-08", label: "11월 8일 (주일)", week: "11월 둘째주" },
  { value: "2026-11-15", label: "11월 15일 (주일)", week: "11월 셋째주" },
  { value: "2026-11-22", label: "11월 22일 (주일)", week: "11월 넷째주" },
  { value: "2026-11-29", label: "11월 29일 (주일)", week: "11월 다섯째주" },
] as const;

export function PublishDate() {
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<PublishDateFormData>({
    resolver: zodResolver(publishDateSchema),
    defaultValues: publishDateDefaultValues,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (!saved) return;
      const result = publishDateSchema.safeParse(JSON.parse(saved));
      if (result.success) reset(result.data);
    } catch {
      setError("root", { message: "브라우저 저장 공간을 확인해 주세요" });
    }
  }, [reset, setError]);

  const saveDraft = handleSubmit((data) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(data));
      toast("임시저장했어요");
    } catch {
      setError("root", { message: "브라우저 저장 공간을 확인해 주세요" });
    }
  });

  return (
    <main className="flex min-h-svh min-w-0 flex-1 flex-col items-center px-6 pt-[99px] pb-[70px] max-md:pt-20 max-md:pb-8">
      <div className="flex w-full max-w-[480px] flex-1 flex-col items-center md:-translate-x-[23px]">
        <ol aria-label="주보 만들기 진행 단계" className="flex h-7 items-center gap-[9px]">
          {[1, 2, 3].map((step) => (
            <li key={step} className="flex items-center gap-[9px]" aria-current={step === 1 ? "step" : undefined}>
              {step > 1 && <Image src="/images/home/step-connector.svg" alt="" width={30} height={4} />}
              <span className={`flex size-7 items-center justify-center rounded-full ${step === 1 ? "bg-home-brand/30" : "bg-step-halo"}`}>
                <span className={`flex size-[22px] items-center justify-center rounded-full text-[13px] leading-[16px] font-black tracking-[-1.04px] ${step === 1 ? "bg-home-brand text-foreground" : "bg-input text-muted-foreground"}`}>{step}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-[62px] w-full text-center max-md:mt-10">
          <h1 className="text-[36px] leading-[1.25] font-extrabold tracking-[-2.88px] max-sm:text-[30px]">주보 발행 날짜를<br />선택해 주세요</h1>
          <p className="mt-3 text-sm leading-[18px] tracking-[-1.12px] text-muted-foreground">발행일(주일) 기준으로 주차가 자동 계산돼요</p>
        </div>
        <form className="mt-[82px] flex w-full flex-1 flex-col max-md:mt-12" onSubmit={handleSubmit(({ date }) => {
          const selected = publishDates.find((option) => option.value === date)!;
          toast(`${selected.label} · ${selected.week}`, { description: "다음 단계를 준비하고 있어요" });
        })}>
          <fieldset>
            <legend className="sr-only">주보 발행 날짜</legend>
            <FieldGroup className="gap-4">
              {publishDates.map((option) => (
                <Field key={option.value} className="relative">
                  <input type="radio" value={option.value} id={option.value} {...register("date")} className="peer sr-only" />
                  <FieldLabel htmlFor={option.value} className="flex min-h-[63px] cursor-pointer items-center gap-2 rounded-2xl border bg-card py-[18px] pr-4 pl-5 peer-checked:min-h-16 peer-checked:border-selection-border peer-checked:bg-home-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring">
                    <span className="text-xl leading-[25px] font-semibold tracking-[-0.4px] group-has-checked/field:font-extrabold max-sm:text-base">{option.label}</span>
                    <span className="ml-auto text-base leading-5 font-normal tracking-[-0.64px] text-muted-foreground group-has-checked/field:text-foreground max-sm:text-[13px]">{option.week}</span>
                    <Image src="/images/home/date-check.svg" alt="" width={24} height={24} className="hidden shrink-0 group-has-checked/field:block" />
                  </FieldLabel>
                </Field>
              ))}
            </FieldGroup>
            <FieldError errors={[errors.date]} />
          </fieldset>
          <FieldError errors={[errors.root]} />
          <div className="mt-auto flex flex-col gap-2 pt-12 max-md:mt-12 md:translate-x-px">
            <Button type="submit" className="h-12 w-full rounded-lg border-0 text-base font-extrabold">다음</Button>
            <Button type="button" variant="outline" onClick={saveDraft} className="h-12 w-full rounded-lg border-draft-border bg-draft text-base font-bold hover:bg-input">임시저장</Button>
          </div>
        </form>
      </div>
    </main>
  );
}
