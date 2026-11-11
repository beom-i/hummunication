export function bulletinDateCode(date: string) {
  return date.slice(2).replaceAll("-", "");
}

export function bulletinTitle(date: string) {
  const week = ["첫째", "둘째", "셋째", "넷째", "다섯째"][Math.floor((Number(date.slice(-2)) - 1) / 7)];
  return `${Number(date.slice(5, 7))}월 ${week}주 주보`;
}

export const bulletinHref = (date: string) => `/bulletins?date=${encodeURIComponent(date)}`;
