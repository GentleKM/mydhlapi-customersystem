// 이메일과 비밀번호로 로그인할 수 있는 MyDHL 고객용 로그인 화면입니다.

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AuthButtons } from "@/components/AuthButtons";
import { FloatHomeButton } from "@/components/FloatHomeButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

const PASSWORD_REGEX = {
  upper: /[A-Z]/,
  lower: /[a-z]/,
  digit: /[0-9]/,
  special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
};

/** PRD에 정의된 Supabase Auth 기반 로그인 플로우를 위한 기본 로그인 페이지 컴포넌트입니다. */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

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
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      router.replace("/");
    } catch {
      alert("이메일 또는 비밀번호가 올바르지 않습니다.");
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
        <div className="w-full max-w-md">
          <div className="mb-8 text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              해외 배송하기 (DHL Express)
            </h1>
            <p className="text-sm text-muted-foreground">
              승인 받은 사용자만 운송장 생성 및 픽업 요청이 가능합니다.
            </p>
          </div>

        <Card className="bg-card/80 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">이메일 & 비밀번호 입력</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">이메일</Label>
                <p className="text-xs text-muted-foreground">
                  유효한 이메일 형식 (예: you@example.com)
                </p>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">비밀번호</Label>
                <p className="text-xs text-muted-foreground">
                  8자 이상, 영문 대·소문자, 숫자, 특수기호 포함
                </p>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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
                    로그인 중...
                  </>
                ) : (
                  "로그인"
                )}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                아직 계정이 없으신가요?
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href="/signup">회원가입 하러가기</Link>
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

