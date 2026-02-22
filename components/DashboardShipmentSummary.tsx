// 배송 상태별 운송장 개수를 요약해서 보여주는 대시보드 카드 컴포넌트입니다.

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type ShipmentDashboardStatus =
  | "draft"
  | "label_created"
  | "pickup_completed"
  | "delivered";

export interface DashboardShipmentSummaryProps {
  /** 각 배송 상태별 운송장 개수 정보입니다. */
  stats: Record<ShipmentDashboardStatus, number>;
}

const STATUS_LABEL_MAP: Record<ShipmentDashboardStatus, string> = {
  draft: "작성 중",
  label_created: "운송장 생성 완료",
  pickup_completed: "픽업 완료",
  delivered: "배송 완료",
};

/** 숫자 0: 회색(secondary), 0이 아님: 파란색(default) */
function getBadgeVariant(value: number): "secondary" | "default" {
  return value === 0 ? "secondary" : "default";
}

/** PRD에 정의된 배송 상태 대시보드 요약 UI를 구현하는 컴포넌트입니다. */
export function DashboardShipmentSummary({
  stats,
}: DashboardShipmentSummaryProps) {
  const entries = (Object.keys(stats) as ShipmentDashboardStatus[]).map(
    (statusKey) => ({
      status: statusKey,
      label: STATUS_LABEL_MAP[statusKey],
      value: stats[statusKey] ?? 0,
    }),
  );

  return (
    <section
      aria-label="배송 상태 요약"
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
    >
      {entries.map(({ status, label, value }) => (
        <Card
          key={status}
          className="bg-card/80 backdrop-blur-sm transition hover:bg-card"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <Badge
              variant={getBadgeVariant(value)}
              asChild
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Link href={`/shipments?status=${status}`}>{value}</Link>
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              실시간 배송 현황을 한눈에 파악할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

