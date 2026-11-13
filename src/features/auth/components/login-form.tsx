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
import { PasswordInput } from "@/components/ui/password-input";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { type LoginFormData, loginDefaultValues, loginSchema } from "./schemas";

// Accounts are issued by an admin — there is intentionally no sign-up link.
export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await createClient().auth.signInWithPassword(values);
    if (error) {
      setError("root", { message: "이메일 또는 비밀번호가 올바르지 않아요." });
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    const path = next?.split("?")[0];
    router.push(next && path && ["/home", "/weekly", "/bulletins"].includes(path) ? next : "/home");
    router.refresh();
  });

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>발급받은 계정으로 로그인해 주세요.</CardDescription>
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
                  placeholder="name@company.com"
                  aria-invalid={!!errors.email}
                />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">비밀번호</FieldLabel>
                <PasswordInput
                  {...register("password")}
                  id="password"
                  autoComplete="current-password"
                  placeholder="비밀번호를 입력해 주세요"
                  aria-invalid={!!errors.password}
                />
                <FieldError errors={[errors.password]} />
              </Field>
              <FieldError>{errors.root?.message}</FieldError>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "로그인 중..." : "로그인"}
              </Button>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
