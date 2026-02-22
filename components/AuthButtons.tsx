// 세션에 따라 회원가입/로그인 또는 로그아웃 버튼을 표시하는 컴포넌트입니다.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

/** 로그인 시 로그아웃, 비로그인 시 회원가입/로그인 버튼을 렌더링합니다. */
export function AuthButtons() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (user) {
    return (
      <div className="flex shrink-0 gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <>
              <Spinner className="mr-2 size-4" />
              로그아웃 중...
            </>
          ) : (
            "로그아웃"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href="/signup">회원가입</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/login">로그인</Link>
      </Button>
    </div>
  );
}
