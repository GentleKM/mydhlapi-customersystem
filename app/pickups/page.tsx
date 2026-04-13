"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AuthButtons } from "@/components/AuthButtons";
import { FeaturePageShell } from "@/components/FeaturePageShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPickupRequests, type PickupListItem } from "@/lib/actions/pickup";

const formatDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDateTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
};

const statusLabelMap: Record<PickupListItem["status"], string> = {
  pickup_requested: "픽업 요청",
  pickup_completed: "픽업 완료",
};

function PickupsPageContent() {
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");
  const [items, setItems] = useState<PickupListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadItems = async () => {
      const { data, error: loadError } = await getPickupRequests();
      if (cancelled) return;
      setItems(data ?? []);
      setError(loadError);
      setIsLoading(false);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadItems();
      }
    };

    void loadItems();
    const intervalId = window.setInterval(() => {
      void loadItems();
    }, 2000);
    window.addEventListener("focus", loadItems);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadItems);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <FeaturePageShell>
      <main className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              픽업 조회
            </h1>
            <p className="text-muted-foreground">요청한 픽업 목록 조회하기</p>
          </div>
          <AuthButtons />
        </div>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">픽업 요청 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">픽업 번호</TableHead>
                  <TableHead className="text-center">픽업 날짜</TableHead>
                  <TableHead className="text-center">요청 날짜</TableHead>
                  <TableHead className="text-center">출발 국가</TableHead>
                  <TableHead className="text-center">도착 국가</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center">{item.pickupNumber ?? "-"}</TableCell>
                    <TableCell className="text-center">{formatDate(item.pickupDate)}</TableCell>
                    <TableCell className="text-center">{formatDateTime(item.requestedAt)}</TableCell>
                    <TableCell className="text-center">{item.originCountry}</TableCell>
                    <TableCell className="text-center">{item.destinationCountry}</TableCell>
                    <TableCell className="text-center">{statusLabelMap[item.status]}</TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      {isLoading
                        ? "로딩 중..."
                        : error
                          ? `조회에 실패했습니다: ${error}`
                          : "등록된 픽업 요청이 없습니다."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {notice && (
          <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
            <p className="text-sm whitespace-normal break-words leading-6">
              {notice}
            </p>
          </Alert>
        )}
      </main>
    </FeaturePageShell>
  );
}

export default function PickupsPage() {
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
      <PickupsPageContent />
    </Suspense>
  );
}
