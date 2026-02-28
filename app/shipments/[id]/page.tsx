// 운송장 상세 정보를 보여주고 수정/삭제를 제공하는 페이지입니다.

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

import { AuthButtons } from "@/components/AuthButtons";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatHomeButton } from "@/components/FloatHomeButton";
import { getShipmentById, deleteShipment, createDhlLabel } from "@/lib/actions/shipment";

const STATUS_LABEL: Record<string, string> = {
  draft: "작성 중",
  label_created: "운송장 생성 완료",
  pickup_completed: "픽업 완료",
  delivered: "배송 완료",
};

export default function ShipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [labelError, setLabelError] = useState<string | null>(null);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [data, setData] = useState<
    (Record<string, unknown> & {
      lineItems: Array<Record<string, unknown>>;
      package: Record<string, unknown> | null;
    }) | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getShipmentById(id).then(({ data: d, error: e }) => {
      if (e) setError(e);
      else if (d) setData(d);
    });
  }, [id]);

  const handleCreateLabel = async () => {
    if (isCreatingLabel) return;
    setIsCreatingLabel(true);
    setLabelError(null);
    try {
      const { awb, error } = await createDhlLabel(id);
      if (error) {
        setLabelError(error);
        return;
      }
      const { data: d } = await getShipmentById(id);
      if (d) setData(d);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말 이 운송장을 삭제하시겠습니까?")) return;
    setIsDeleting(true);
    const { error } = await deleteShipment(id);
    setIsDeleting(false);
    if (error) alert(`삭제 실패: ${error}`);
    else router.push("/shipments");
  };

  if (error || !id) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          <p className="text-destructive">{error ?? "잘못된 경로입니다."}</p>
          <Button asChild variant="outline">
            <Link href="/shipments">목록으로</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <p className="text-muted-foreground">로딩 중...</p>
      </main>
    );
  }

  const s = data;
  const pkg = data.package;

  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            운송장 상세
          </h1>
          <p className="text-muted-foreground">
            운송장 정보를 확인하고 수정 또는 삭제할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <AuthButtons />
          <Button asChild variant="outline" size="sm">
            <Link href={`/shipments/${id}/edit`}>수정</Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {STATUS_LABEL[(s.status as string) ?? ""] ?? String(s.status ?? "")}
        </Badge>
        <span className="text-sm text-muted-foreground">
          운송장 번호: {(s.airway_bill_number as string) ?? "미발급"}
        </span>
        {(s.status as string) === "draft" && (
          <Button
            size="sm"
            onClick={handleCreateLabel}
            disabled={isCreatingLabel}
          >
            {isCreatingLabel ? (
              <>
                <Spinner className="mr-2 size-4" />
                라벨 생성 중...
              </>
            ) : (
              "라벨 생성"
            )}
          </Button>
        )}
      </div>
      {labelError && (
        <p className="text-sm text-destructive">{labelError}</p>
      )}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">발송인 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{String(s.shipper_name ?? "")}</p>
          <p>{String(s.shipper_address1 ?? "")}</p>
          {Boolean(s.shipper_address2) && <p>{String(s.shipper_address2)}</p>}
          <p>
            {String(s.shipper_postal_code ?? "")} {String(s.shipper_city ?? "")}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">수취인 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{String(s.receiver_name ?? "")}</p>
          {Boolean(s.receiver_company) && <p>{String(s.receiver_company)}</p>}
          <p>{String(s.receiver_address1 ?? "")}</p>
          {Boolean(s.receiver_address2) && <p>{String(s.receiver_address2)}</p>}
          <p>
            {String(s.receiver_postal_code ?? "")} {String(s.receiver_city ?? "")}{" "}
            {String(s.receiver_country ?? "")}
          </p>
          <p>{String(s.receiver_email ?? "")}</p>
          <p>{String(s.receiver_phone ?? "")}</p>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">물품 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            구분: {s.content_type === "documents" ? "서류" : "물품"}
          </p>
          {data.lineItems.length > 0 && (
            <div className="space-y-2">
              {data.lineItems.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-muted/30 p-3 text-sm"
                >
                  <p className="font-medium">{(item.description as string) ?? ""}</p>
                  <p className="text-muted-foreground">
                    수량: {String(item.quantity_value ?? "")} {String(item.quantity_unit ?? "")} / 금액:{" "}
                    {String(item.value ?? "")} / 무게: {String(item.weight ?? "")} kg
                  </p>
                  {Boolean(item.hs_code) && (
                    <p className="text-muted-foreground">HS: {String(item.hs_code)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pkg && (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">포장 정보</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            무게: {String(pkg.weight ?? "")} kg / {String(pkg.length ?? "")} × {String(pkg.width ?? "")} × {String(pkg.height ?? "")} cm
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/shipments">목록으로</Link>
        </Button>
      </div>
      <FloatHomeButton />
    </main>
  );
}
