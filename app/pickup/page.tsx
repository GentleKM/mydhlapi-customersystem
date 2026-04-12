// 별도의 픽업 예약만을 위한 전용 픽업 요청 페이지입니다.

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  PickupRequestForm,
  DEFAULT_PICKUP_FORM_VALUE,
  type PickupRequestFormValue,
} from "@/components/PickupRequestForm";
import { AuthButtons } from "@/components/AuthButtons";
import { FeaturePageShell } from "@/components/FeaturePageShell";
import { getIsApproved } from "@/lib/actions/shipment";
import { submitPickupRequest } from "@/lib/actions/pickup";

/** PRD에 정의된 픽업 요청 페이지: MyDHL POST /pickups 및 Supabase 기록을 연동합니다. */
export default function PickupPage() {
  const [isApproved, setIsApproved] = useState(false);
  const [formValue, setFormValue] = useState<PickupRequestFormValue>(
    DEFAULT_PICKUP_FORM_VALUE
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    variant: "ok" | "err";
    message: string;
  } | null>(null);

  useEffect(() => {
    getIsApproved().then(setIsApproved);
  }, []);

  const handleSubmit = async () => {
    if (!isApproved) {
      alert("승인 받은 사용자만 픽업 요청을 할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await submitPickupRequest(formValue);
      if (res.ok) {
        const nums = res.dispatchConfirmationNumbers?.join(", ") ?? "-";
        setFeedback({
          variant: "ok",
          message: `픽업 요청이 접수되었습니다. 배차 확인번호: ${nums}`,
        });
      } else {
        setFeedback({
          variant: "err",
          message: res.error ?? "요청에 실패했습니다.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeaturePageShell>
      <main className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              픽업 요청
            </h1>
            <p className="text-muted-foreground">
              DHL Express 픽업 예약(POST /pickups)에 필요한 정보를 입력하세요.
            </p>
          </div>
          <AuthButtons />
        </div>

        {!isApproved && (
          <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
            <p className="col-start-2 col-span-1 text-sm text-yellow-900 dark:text-yellow-100">
              승인 받은 사용자만 운송장 생성 및 픽업 요청이 가능합니다.
            </p>
          </Alert>
        )}

        {feedback && (
          <Alert
            className={
              feedback.variant === "ok"
                ? "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
                : "border-destructive/50 bg-destructive/10"
            }
          >
            <p className="text-sm whitespace-pre-wrap">{feedback.message}</p>
          </Alert>
        )}

        <PickupRequestForm
          value={formValue}
          onChange={setFormValue}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        <Card className="bg-muted/30 border-dashed">
          <CardHeader className="py-3">
            <CardTitle className="text-base font-medium">
              참고: 제공하신 RTF 샘플
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2 pb-4">
            <p>
              샘플 JSON은 <strong>운송장 생성</strong> 요청 본문에 포함되는{" "}
              <code className="text-xs">pickup</code>,{" "}
              <code className="text-xs">customerDetails</code>,{" "}
              <code className="text-xs">content</code> 등이 합쳐진 형태입니다.
            </p>
            <p>
              이 화면은 Swagger의 <strong>독립 픽업 API</strong>{" "}
              <code className="text-xs">POST /pickups</code>(예시:{" "}
              <code className="text-xs">nonDocRequestPickup</code>)에 맞추었으며,
              동일하게 발송인·수취인 주소, 연락처, 픽업 일시·마감, 화물(제품·패키지·
              신고가액)을 요청합니다.
            </p>
          </CardContent>
        </Card>
      </main>
    </FeaturePageShell>
  );
}
