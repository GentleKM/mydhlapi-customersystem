// 메인 화면 외 페이지에서 우측 하단에 표시되는 메인으로 가기 플로팅 버튼입니다.

"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

/** 우측 하단 고정, 로그인 버튼과 동일한 파란색(primary) 스타일의 메인 화면 이동 버튼입니다. */
export function FloatHomeButton() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button asChild size="sm">
        <Link href="/">메인화면으로 가기</Link>
      </Button>
    </div>
  );
}
