// 운송장 mock 데이터입니다. TODO: Supabase 연동 시 제거됩니다.

import type { ShipmentListItem } from "@/components/ShipmentList";

/** mock 운송장 목록 (운송장 조회 및 메인 대시보드에서 공통 사용) */
export const MOCK_SHIPMENTS: ShipmentListItem[] = [
  {
    id: "1",
    airwayBillNumber: "1234567890",
    destinationCountry: "US",
    status: "delivered",
    createdAt: "2026-01-15T10:30:00Z",
  },
  {
    id: "2",
    airwayBillNumber: "0987654321",
    destinationCountry: "JP",
    status: "pickup_completed",
    createdAt: "2026-01-20T14:20:00Z",
  },
  {
    id: "3",
    destinationCountry: "GB",
    status: "label_created",
    createdAt: "2026-01-25T09:15:00Z",
  },
  {
    id: "4",
    destinationCountry: "CN",
    status: "draft",
    createdAt: "2026-01-28T16:45:00Z",
  },
];

type ShipmentStatus = ShipmentListItem["status"];

/** mock 운송장 목록에서 상태별 개수를 계산합니다. */
export function getShipmentStatsByStatus() {
  const stats: Record<ShipmentStatus, number> = {
    draft: 0,
    label_created: 0,
    pickup_completed: 0,
    delivered: 0,
  };
  for (const s of MOCK_SHIPMENTS) {
    stats[s.status] += 1;
  }
  return stats;
}
