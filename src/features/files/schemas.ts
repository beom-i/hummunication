import { z } from "zod";
export const photoSchema = z.file().max(5 * 1024 * 1024, "5MB 이하의 사진을 올려 주세요").mime(["image/png", "image/jpeg", "image/webp"], "PNG, JPG, WebP 사진을 올려 주세요");
