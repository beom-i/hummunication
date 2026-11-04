import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "이메일을 입력해 주세요").pipe(z.email("올바른 이메일을 입력해 주세요")),
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
});
export type LoginFormData = z.infer<typeof loginSchema>;
export const loginDefaultValues: LoginFormData = { email: "", password: "" };

export const forgotPasswordSchema = loginSchema.pick({ email: true });
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export const forgotPasswordDefaultValues: ForgotPasswordFormData = { email: "" };

// min 8: keep in sync with Supabase Auth "Minimum password length" (dashboard + supabase/config.toml).
export const updatePasswordSchema = z
  .object({
    newPassword: z.string().min(1, "필수 항목을 입력해 주세요").min(8, "8자 이상 입력해 주세요"),
    confirmPassword: z.string().min(1, "필수 항목을 입력해 주세요"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "비밀번호가 일치하지 않아요",
    path: ["confirmPassword"],
  });
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;
export const updatePasswordDefaultValues: UpdatePasswordFormData = { newPassword: "", confirmPassword: "" };
