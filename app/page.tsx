// 전체 배송 현황 대시보드와 주요 메뉴 바로가기를 제공하는 메인 화면입니다.

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthButtons } from "@/components/AuthButtons";
import { FeaturePageShell } from "@/components/FeaturePageShell";
import { Button } from "@/components/ui/button";
import { DashboardShipmentSummary } from "@/components/DashboardShipmentSummary";
import { getShipmentStats } from "@/lib/actions/shipment";
import type { ShipmentStats } from "@/lib/actions/shipment";

const EMPTY_STATS: ShipmentStats = {
  draft: 0,
  label_created: 0,
  pickup_completed: 0,
  delivered: 0,
};

/** 메인 화면 주요 메뉴 버튼: 키 큰 터치 영역·강조 타이포·미세 호버 피드백 */
const homeActionButtonClassName =
  "h-auto min-h-14 w-full rounded-xl px-5 py-3.5 text-base font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 sm:min-h-[3.75rem] sm:py-4 sm:text-lg";

/** PRD에 정의된 메인 화면: 배송 현황 대시보드 및 주요 메뉴(견적, 생성, 조회, 픽업) 바로가기 버튼을 제공합니다. */
export default function HomePage() {
  const [stats, setStats] = useState<ShipmentStats>(EMPTY_STATS);

  useEffect(() => {
    getShipmentStats().then((s) => setStats(s ?? EMPTY_STATS));
  }, []);

  return (
    <FeaturePageShell>
    <main className="w-full space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            DHL Express
          </h1>
          <p className="text-muted-foreground">
            실시간 배송 현황을 확인하고 운송장을 관리하세요.
          </p>
        </div>
        <AuthButtons />
      </div>

      {/* 히어로: public/main page hero2.png (비율·컨테이너 크기 유지) */}
      <section
        className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/10"
        aria-hidden
      >
        <div className="relative aspect-[16/10] w-full max-h-[min(280px,40vh)] sm:aspect-[2/1] sm:max-h-[min(340px,45vh)] md:max-h-[min(400px,50vh)] lg:aspect-[21/9]">
          <Image
            src="/main%20page%20hero2.png"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1152px"
          />
        </div>
      </section>

      {/* 배송 상태 대시보드 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">배송 현황 요약</h2>
        <DashboardShipmentSummary stats={stats} />
      </section>

      {/* 주요 메뉴: 배경 위에 직접 배치되는 큰 버튼 그리드 */}
      <section aria-label="주요 메뉴">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button asChild size="lg" className={homeActionButtonClassName}>
            <Link href="/quote">견적 조회하기</Link>
          </Button>
          <Button asChild size="lg" className={homeActionButtonClassName}>
            <Link href="/shipments/create">운송장 만들기</Link>
          </Button>
          <Button asChild size="lg" className={homeActionButtonClassName}>
            <Link href="/shipments">운송장 목록 보기</Link>
          </Button>
          <Button asChild size="lg" className={homeActionButtonClassName}>
            <Link href="/pickup">픽업 요청하기</Link>
          </Button>
        </div>
      </section>
    </main>
    </FeaturePageShell>
  );
}
