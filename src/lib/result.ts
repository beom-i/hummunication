import type { ZodError } from "zod";

export type ErrorCode = "INVALID_INPUT" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";
export type AppError = { code: ErrorCode; message: string; fields?: Record<string, string[]> };
export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };
export const failure = (code: ErrorCode, message: string): Result<never> => ({ ok: false, error: { code, message } });

export function invalidInput(error: ZodError): Result<never> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    if (key) (fields[key] ??= []).push(issue.message);
  }
  return { ok: false, error: { code: "INVALID_INPUT", message: "입력 내용을 확인해 주세요", fields } };
}
export function databaseFailure(error: { code?: string }): Result<never> {
  switch (error.code) {
    case "22023": case "22007": case "22008": case "22P02": case "23514": return failure("INVALID_INPUT", "입력 내용을 확인해 주세요");
    case "42501": return failure("FORBIDDEN", "접근 권한을 확인해 주세요");
    case "P0002": return failure("NOT_FOUND", "자료를 다시 확인해 주세요");
    case "23505": return failure("CONFLICT", "같은 날짜나 순서의 자료가 있어요. 저장된 내용을 확인해 주세요");
    case "23503": return failure("CONFLICT", "사진 또는 자료의 연결을 확인해 주세요");
    default: return failure("INTERNAL_ERROR", "잠시 후 다시 시도해 주세요");
  }
}
