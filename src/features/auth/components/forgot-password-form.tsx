"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  type ForgotPasswordFormData,
  forgotPasswordDefaultValues,
  forgotPasswordSchema,
} from "./schemas";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid, isDirty, isSubmitting, isSubmitSuccessful },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "all",
    defaultValues: forgotPasswordDefaultValues,
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    // This URL must be listed in Supabase Auth → URL Configuration → Redirect URLs.
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
    } catch {
      const message = "메일을 보내지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요";
      setError("root", { message }); toast.error(message);
    }
  });

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {isSubmitSuccessful && !errors.root ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">메일을 확인해 주세요</CardTitle>
            <CardDescription>
              등록된 이메일이라면 비밀번호 재설정 링크가 발송돼요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">비밀번호 찾기</CardTitle>
            <CardDescription>
              이메일을 입력하면 재설정 링크를 보내드려요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} noValidate>
              <FieldGroup>
                <Field data-invalid={!!errors.email}>
                  <FieldLabel htmlFor="email">이메일</FieldLabel>
                  <Input
                    {...register("email")}
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="이메일을 입력해 주세요"
                    aria-invalid={!!errors.email}
                  />
                  <FieldError errors={[errors.email]} />
                </Field>
                <FieldError>{errors.root?.message}</FieldError>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!isDirty || !isValid || isSubmitting}
                >
                  {isSubmitting ? "전송 중..." : "재설정 링크 전송하기"}
                </Button>
                <Link
                  href="/auth/login"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  로그인으로 돌아가기
                </Link>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
