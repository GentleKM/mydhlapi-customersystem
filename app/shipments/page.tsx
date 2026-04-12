// 기존 생성된 운송장의 목록과 상세 정보를 확인하는 운송장 조회 페이지입니다.

"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShipmentList } from "@/components/ShipmentList";
import { ShipmentFilters } from "@/components/ShipmentFilters";
import type {
  ShipmentFiltersValue,
  ShipmentFilterStatus,
} from "@/components/ShipmentFilters";
import type { ShipmentListItem } from "@/components/ShipmentList";
import { getShipments, syncShipmentTrackingFromDhl } from "@/lib/actions/shipment";
import { AuthButtons } from "@/components/AuthButtons";
import { FeaturePageShell } from "@/components/FeaturePageShell";

const VALID_STATUSES: ShipmentFilterStatus[] = [
  "draft",
  "label_created",
  "pickup_completed",
  "delivered",
];

/** useSearchParams를 사용하는 내부 컴포넌트입니다. Suspense로 감싸 prerender 오류를 방지합니다. */
function ShipmentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFromUrl = searchParams.get("status");
  const initialStatus: ShipmentFilterStatus =
    statusFromUrl && VALID_STATUSES.includes(statusFromUrl as ShipmentFilterStatus)
      ? (statusFromUrl as ShipmentFilterStatus)
      : "all";

  const [filters, setFilters] = useState<ShipmentFiltersValue>(() => ({
    status: initialStatus,
    sortKey: "created_at_desc" as const,
  }));
  const [items, setItems] = useState<ShipmentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    if (statusFromUrl && VALID_STATUSES.includes(statusFromUrl as ShipmentFilterStatus)) {
      setFilters((prev) => ({ ...prev, status: statusFromUrl as ShipmentFilterStatus }));
    }
  }, [statusFromUrl]);

  const loadShipments = useCallback(() => {
    setIsLoading(true);
    getShipments({
      status: filters.status === "all" ? undefined : filters.status,
      destinationCountry: filters.destinationCountry,
    }).then(({ data, error }) => {
      setItems(data ?? []);
      setIsLoading(false);
      if (error) console.error(error);
    });
  }, [filters.status, filters.destinationCountry]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const handleSyncTracking = async () => {
    setSyncNotice(null);
    setIsSyncing(true);
    try {
      const res = await syncShipmentTrackingFromDhl();
      await loadShipments();
      if (res.failures.length > 0) {
        const sample = res.failures
          .slice(0, 3)
          .map((f) => `${f.awb}: ${f.message}`)
          .join(" / ");
        setSyncNotice(
          res.updated > 0
            ? `${res.updated}건 반영했으나 ${res.failures.length}건 실패. ${sample}`
            : `추적 갱신에 실패했습니다 (${res.failures.length}건). ${sample}`
        );
      } else if (res.updated === 0) {
        setSyncNotice(
          "갱신된 항목이 없습니다. 운송장 번호가 있거나 추적 응답이 있는지 확인해 주세요."
        );
      } else {
        setSyncNotice(`배송 상태가 갱신되었습니다. (${res.updated}건 반영)`);
      }
      if (res.error && res.failures.length > 0) {
        console.warn(res.error, res.failures);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRowClick = (item: ShipmentListItem) => {
    router.push(`/shipments/${item.id}`);
  };

  const countryOptions = [
    { code: "US", label: "미국 (US)" },
    { code: "JP", label: "일본 (JP)" },
    { code: "GB", label: "영국 (GB)" },
    { code: "CN", label: "중국 (CN)" },
    { code: "DE", label: "독일 (DE)" },
    { code: "KR", label: "대한민국 (KR)" },
    { code: "SG", label: "싱가포르 (SG)" },
    { code: "AU", label: "호주 (AU)" },
    { code: "CA", label: "캐나다 (CA)" },
    { code: "FR", label: "프랑스 (FR)" },
  ];

  return (
    <FeaturePageShell>
    <main className="max-w-4xl mx-auto w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            운송장 조회
          </h1>
          <p className="text-muted-foreground">
            DHL 운송장 조회하기
          </p>
        </div>
        <AuthButtons />
      </div>

      <ShipmentFilters
        value={filters}
        countryOptions={countryOptions}
        onChange={setFilters}
      />

      {syncNotice && (
        <p className="text-center text-sm text-muted-foreground" role="status">
          {syncNotice}
        </p>
      )}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">운송장 목록</CardTitle>
          <CardAction>
            <Button
              type="button"
              disabled={isSyncing || isLoading}
              onClick={() => void handleSyncTracking()}
            >
              {isSyncing ? "상태 동기화 중..." : "상태 업데이트"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ShipmentList
            items={items}
            onRowClick={handleRowClick}
            emptyMessage={
              isLoading
                ? "로딩 중..."
                : "등록된 운송장이 없습니다."
            }
          />
        </CardContent>
      </Card>
    </main>
    </FeaturePageShell>
  );
}

/** PRD에 정의된 운송장 조회 페이지: 기존 생성된 운송장의 상세 정보 및 히스토리를 확인합니다. */
export default function ShipmentsPage() {
  return (
    <Suspense
      fallback={
        <FeaturePageShell>
          <main className="max-w-4xl mx-auto w-full">
            <p className="text-muted-foreground">로딩 중...</p>
          </main>
        </FeaturePageShell>
      }
    >
      <ShipmentsPageContent />
    </Suspense>
  );
}
