"use client";
import { uploadPhoto } from "@/features/files/actions";
import type { Result } from "@/lib/result";
import type { WeeklyFormData } from "./schemas";

export function weeklyValuesForSave(values: WeeklyFormData): WeeklyFormData {
  return {
    ...values,
    families: values.families.map(family => ({ ...family, photo: family.photo_id ? "" : family.photo })),
    sermonThumbnail: values.sermon.thumbnailId ? "" : values.sermonThumbnail,
  };
}

export async function prepareWeeklyPhotos(values: WeeklyFormData): Promise<Result<WeeklyFormData>> {
  const families = [];
  for (let index = 0; index < values.families.length; index++) {
    const group = values.families[index];
    if (group.photo && !group.photo_id) {
      if (!group.photo.startsWith("data:image/")) return { ok: false, error: { code: "INVALID_INPUT", message: "사진을 다시 올려 주세요", fields: { [`families.${index}.photo`]: ["사진을 다시 올려 주세요"] } } };
      const response = await fetch(group.photo);
      const blob = await response.blob();
      const input = new FormData();
      input.set("photo", new File([blob], "photo", { type: blob.type }));
      const uploaded = await uploadPhoto(input);
      if (!uploaded.ok) return { ok: false, error: { ...uploaded.error, fields: { [`families.${index}.photo`]: [uploaded.error.message] } } };
      families.push({ ...group, photo_id: uploaded.data.id });
    } else families.push(group);
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
  return { ok: true, data: { ...values, families, sermon: { ...values.sermon, thumbnailId } } };
}
