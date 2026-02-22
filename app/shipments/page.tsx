// 기존 생성된 운송장의 목록과 상세 정보를 확인하는 운송장 조회 페이지입니다.

"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
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
import { getShipments } from "@/lib/actions/shipment";
import { AuthButtons } from "@/components/AuthButtons";
import { FloatHomeButton } from "@/components/FloatHomeButton";

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

  useEffect(() => {
    if (statusFromUrl && VALID_STATUSES.includes(statusFromUrl as ShipmentFilterStatus)) {
      setFilters((prev) => ({ ...prev, status: statusFromUrl as ShipmentFilterStatus }));
    }
  }, [statusFromUrl]);

  useEffect(() => {
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
    <main className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            운송장 조회
          </h1>
          <p className="text-muted-foreground">
            생성된 운송장 목록을 확인하고 상세 정보를 조회하세요.
          </p>
        </div>
        <AuthButtons />
      </div>

      <ShipmentFilters
        value={filters}
        countryOptions={countryOptions}
        onChange={setFilters}
      />

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">운송장 목록</CardTitle>
          <CardAction>
            <Button asChild>
              <Link href="/shipments/create">새 운송장 만들기</Link>
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
      <FloatHomeButton />
    </main>
  );
}

/** PRD에 정의된 운송장 조회 페이지: 기존 생성된 운송장의 상세 정보 및 히스토리를 확인합니다. */
export default function ShipmentsPage() {
  return (
    <Suspense fallback={<main className="container mx-auto px-4 py-8"><p className="text-muted-foreground">로딩 중...</p></main>}>
      <ShipmentsPageContent />
    </Suspense>
  );
}
