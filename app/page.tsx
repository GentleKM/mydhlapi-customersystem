// 전체 배송 현황 대시보드와 주요 메뉴 바로가기를 제공하는 메인 화면입니다.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, FileText, Search, Truck } from "lucide-react";

import { AuthButtons } from "@/components/AuthButtons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShipmentSummary } from "@/components/DashboardShipmentSummary";
import { getShipmentStats } from "@/lib/actions/shipment";
import type { ShipmentStats } from "@/lib/actions/shipment";

const EMPTY_STATS: ShipmentStats = {
  draft: 0,
  label_created: 0,
  pickup_completed: 0,
  delivered: 0,
};

/** PRD에 정의된 메인 화면: 배송 현황 대시보드 및 주요 메뉴(견적, 생성, 조회, 픽업) 바로가기 버튼을 제공합니다. */
export default function HomePage() {
  const [stats, setStats] = useState<ShipmentStats>(EMPTY_STATS);

  useEffect(() => {
    getShipmentStats().then((s) => setStats(s ?? EMPTY_STATS));
  }, []);

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            MyDHL 배송 관리
          </h1>
          <p className="text-muted-foreground">
            실시간 배송 현황을 확인하고 운송장을 관리하세요.
          </p>
        </div>
        <AuthButtons />
      </div>

      {/* 배송 상태 대시보드 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">배송 현황 요약</h2>
        <DashboardShipmentSummary stats={stats} />
      </section>

      {/* 주요 메뉴 바로가기 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">주요 메뉴</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/80 backdrop-blur-sm transition hover:bg-card hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="size-5 text-primary" />
                견적 조회
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                목적지별 운임 견적을 확인하고 발송 가능 여부를 확인하세요.
              </p>
              <Button asChild className="w-full" variant="default">
                <Link href="/quote">견적 조회하기</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm transition hover:bg-card hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-5 text-primary" />
                운송장 생성
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                새로운 운송장을 생성하고 AI 기능으로 빠르게 입력하세요.
              </p>
              <Button asChild className="w-full" variant="default">
                <Link href="/shipments/create">운송장 만들기</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm transition hover:bg-card hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-5 text-primary" />
                운송장 조회
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                생성된 운송장 목록을 확인하고 상세 정보를 조회하세요.
              </p>
              <Button asChild className="w-full" variant="default">
                <Link href="/shipments">운송장 목록 보기</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm transition hover:bg-card hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-5 text-primary" />
                픽업 요청
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                별도의 픽업 예약을 요청하고 일정을 관리하세요.
              </p>
              <Button asChild className="w-full" variant="default">
                <Link href="/pickup">픽업 요청하기</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
