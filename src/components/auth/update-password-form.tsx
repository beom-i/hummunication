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
import { PasswordInput } from "@/components/ui/password-input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  type UpdatePasswordFormData,
  updatePasswordDefaultValues,
  updatePasswordSchema,
} from "./schemas";

// Used after a password-reset or admin-invite email link (session already active).
export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid, isDirty, isSubmitting },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    mode: "all",
    defaultValues: updatePasswordDefaultValues,
  });

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    const { error } = await createClient().auth.updateUser({ password: newPassword });
    if (error) {
      setError("root", { message: error.message });
      return;
    }
    router.push("/protected");
  });

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">비밀번호 재설정</CardTitle>
          <CardDescription>새로 사용할 비밀번호를 입력해 주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.newPassword}>
                <FieldLabel htmlFor="newPassword">새 비밀번호</FieldLabel>
                <PasswordInput
                  {...register("newPassword", { deps: ["confirmPassword"] })}
                  id="newPassword"
                  autoComplete="new-password"
                  placeholder="새 비밀번호를 입력해 주세요"
                  aria-invalid={!!errors.newPassword}
                />
                <FieldError errors={[errors.newPassword]} />
              </Field>
              <Field data-invalid={!!errors.confirmPassword}>
                <FieldLabel htmlFor="confirmPassword">새 비밀번호 확인</FieldLabel>
                <PasswordInput
                  {...register("confirmPassword")}
                  id="confirmPassword"
                  autoComplete="new-password"
                  placeholder="새 비밀번호를 한 번 더 입력해 주세요"
                  aria-invalid={!!errors.confirmPassword}
                />
                <FieldError errors={[errors.confirmPassword]} />
              </Field>
              <FieldError>{errors.root?.message}</FieldError>
              <Button
                type="submit"
                className="w-full"
                disabled={!isDirty || !isValid || isSubmitting}
              >
                {isSubmitting ? "저장 중..." : "재설정하기"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
