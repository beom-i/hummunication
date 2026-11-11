"use client";

import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { ko } from "react-day-picker/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DatePickerProps = Omit<React.ComponentProps<"button">, "value"> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function DatePicker({ value, onValueChange, className, ...props }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseISO(value);
  const selected = isValid(parsed) ? parsed : undefined;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="field" className={cn("h-[52px] w-full justify-between rounded-xl px-4 text-base font-normal active:translate-y-0", className)} {...props}>
        {selected ? format(selected, "yyyy. MM. dd.") : "날짜를 선택해 주세요"}
        <CalendarIcon className="size-[18px] shrink-0" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="weekly-popover w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] rounded-2xl p-0">
      <Calendar mode="single" required selected={selected} defaultMonth={selected} locale={ko} autoFocus onSelect={(date) => {
        onValueChange(format(date, "yyyy-MM-dd"));
        setOpen(false);
      }} className="w-full rounded-2xl [--cell-size:min(40px,calc((var(--radix-popover-trigger-width)_-_24px)/7))]" classNames={{ root: "w-full", month_grid: "w-full table-fixed" }} />
    </PopoverContent>
  </Popover>;
}
