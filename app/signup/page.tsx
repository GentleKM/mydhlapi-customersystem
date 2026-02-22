// 이메일과 비밀번호로 회원가입할 수 있는 MyDHL 고객용 회원가입 화면입니다.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { AuthButtons } from "@/components/AuthButtons";
import { FloatHomeButton } from "@/components/FloatHomeButton";

const PASSWORD_REGEX = {
  upper: /[A-Z]/,
  lower: /[a-z]/,
  digit: /[0-9]/,
  special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
};

/** PRD에 정의된 Supabase Auth 기반 회원가입 플로우를 위한 기본 회원가입 페이지 컴포넌트입니다. */
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 8) {
      alert("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }

    if (
      !PASSWORD_REGEX.upper.test(password) ||
      !PASSWORD_REGEX.lower.test(password) ||
      !PASSWORD_REGEX.digit.test(password) ||
      !PASSWORD_REGEX.special.test(password)
    ) {
      alert(
        "비밀번호에 영어 대문자, 소문자, 숫자, 특수기호를 모두 포함해주세요.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      router.replace("/");
    } catch {
      alert(
        "회원가입이 정상적으로 완료되지 않았습니다. 다시 한 번 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4">
      <div className="container mx-auto flex justify-end py-8">
        <AuthButtons />
      </div>
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center">
        <div className="w-full max-w-md px-4">
          <div className="mb-8 text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              MyDHL 고객 회원가입
            </h1>
            <p className="text-sm text-muted-foreground">
              이메일과 비밀번호를 입력해 계정을 만드세요.
            </p>
          </div>

        <Card className="bg-card/80 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">새 계정 만들기</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-email">이메일</Label>
                <p className="text-xs text-muted-foreground">
                  유효한 이메일 형식 (예: you@example.com)
                </p>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password">비밀번호</Label>
                <p className="text-xs text-muted-foreground">
                  8자 이상, 영문 대·소문자, 숫자, 특수기호 포함
                </p>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-confirm-password">비밀번호 확인</Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    회원가입 중...
                  </>
                ) : (
                  "회원가입"
                )}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                이미 계정이 있으신가요?
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href="/login">로그인 하러 가기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
      <FloatHomeButton />
    </main>
  );
}
