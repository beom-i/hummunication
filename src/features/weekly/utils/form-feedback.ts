import type { FieldErrors } from "react-hook-form";
import type { WeeklyFormData } from "../schemas";

type Message = { path: string; label: string; message: string };
const labels: Record<string, string> = {
  date: "발행 날짜", sections: "카드뉴스 유형", sermonThumbnail: "설교 썸네일",
  "sermon.date": "설교 날짜", "sermon.speaker": "설교자", "sermon.title": "설교 제목", "sermon.bible": "성경 본문", "sermon.content": "정리 내용", "sermon.thumbnailEdit": "설교 썸네일", "sermon.thumbnailId": "설교 썸네일",
};
const familyLabels: Record<string, string> = { name: "순 이름", photo: "단체 사진", photo_edit: "단체 사진", photo_id: "단체 사진", leader_name: "순장 이름", leader_answer: "순장 답변" };
const senderLabels: Record<string, string> = { name: "이름", generation: "기수", group_name: "소속 순", date: "파송 날짜", prayer: "기도제목" };
function labelFor(path: string) {
  if (labels[path]) return labels[path];
  const [section, index, field, member, memberField] = path.split(".");
  if (section === "families") {
    if (!/^\d+$/.test(index ?? "")) return "새가족 문답";
    const group = `새가족 ${Number(index) + 1}`;
    if (field === "members" && /^\d+$/.test(member ?? "")) return `${group} · 순원 ${Number(member) + 1} ${memberField === "name" ? "이름" : "답변"}`;
    return `${group} · ${familyLabels[field] ?? "문답"}`;
  }
  if (section === "senders") {
    if (!/^\d+$/.test(index ?? "")) return "파송자";
    return `파송자 ${Number(index) + 1} · ${senderLabels[field] ?? "정보"}`;
  }
  return "";
}

export function weeklyErrorMessages(errors: FieldErrors<WeeklyFormData>): Message[] {
  const messages: Message[] = [];
  function visit(value: unknown, path: string) {
    if (!value || typeof value !== "object") return;
    if ("message" in value && typeof value.message === "string") {
      messages.push({ path, label: labelFor(path), message: value.message });
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key !== "ref" && key !== "type" && key !== "types") visit(child, path ? `${path}.${key}` : key);
    }
  }
  visit(errors, "");
  return messages.filter(item => item.path !== "root" || !messages.some(other => other.path !== "root" && (other.message === item.message || errors.root?.type === "INVALID_INPUT")));
}
