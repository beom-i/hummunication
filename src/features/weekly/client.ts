"use client";
import { uploadPhoto } from "@/features/files/actions";
import type { Result } from "@/lib/result";
import type { WeeklyFormData } from "./schemas";

export async function prepareWeeklyPhotos(values: WeeklyFormData): Promise<Result<WeeklyFormData>> {
  const groups = [];
  for (let index = 0; index < values.groups.length; index++) {
    const group = values.groups[index];
    if (group.photo && !group.photoId) {
      if (!group.photo.startsWith("data:image/")) return { ok: false, error: { code: "INVALID_INPUT", message: "사진을 다시 올려 주세요", fields: { [`groups.${index}.photo`]: ["사진을 다시 올려 주세요"] } } };
      const response = await fetch(group.photo);
      const blob = await response.blob();
      const input = new FormData();
      input.set("photo", new File([blob], "photo", { type: blob.type }));
      const uploaded = await uploadPhoto(input);
      if (!uploaded.ok) return { ok: false, error: { ...uploaded.error, fields: { [`groups.${index}.photo`]: [uploaded.error.message] } } };
      groups.push({ ...group, photoId: uploaded.data.id });
    } else groups.push(group);
  }
  let thumbnailId = values.sermon.thumbnailId;
  if (values.sermonThumbnail && !thumbnailId) {
    if (!values.sermonThumbnail.startsWith("data:image/")) return { ok: false, error: { code: "INVALID_INPUT", message: "썸네일을 다시 올려 주세요", fields: { sermonThumbnail: ["썸네일을 다시 올려 주세요"] } } };
    const blob = await (await fetch(values.sermonThumbnail)).blob();
    const input = new FormData();
    input.set("photo", new File([blob], "thumbnail", { type: blob.type }));
    const uploaded = await uploadPhoto(input);
    if (!uploaded.ok) return { ok: false, error: { ...uploaded.error, fields: { sermonThumbnail: [uploaded.error.message] } } };
    thumbnailId = uploaded.data.id;
  }
  return { ok: true, data: { ...values, groups, sermon: { ...values.sermon, thumbnailId } } };
}
