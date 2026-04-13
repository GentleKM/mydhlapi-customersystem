// 별도의 픽업 예약만을 위한 전용 픽업 요청 페이지입니다.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [formValue, setFormValue] = useState<PickupRequestFormValue>(
    DEFAULT_PICKUP_FORM_VALUE
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    variant: "ok" | "err";
    message: string;
  } | null>(null);

  const formatFeedbackMessage = (message: string): string => {
    const normalizedLineBreaks = message.replace(/\r\n/g, "\n");
    const collapsedSingleLines = normalizedLineBreaks.replace(/(?<!\n)\n(?!\n)/g, " ");
    return collapsedSingleLines.replace(/[ \t]{2,}/g, " ").trim();
  };

  useEffect(() => {
    getIsApproved().then(setIsApproved);
  }, []);

  const handleSubmit = async () => {
    if (isApproved !== true) {
      alert("승인된 사용자만 픽업 요청을 할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await submitPickupRequest(formValue);
      if (res.ok) {
        const nums = res.dispatchConfirmationNumbers?.join(", ") ?? "-";
        const notice = encodeURIComponent(
          `픽업 요청이 접수되었습니다. 배차 확인번호: ${nums}`
        );
        router.push(`/pickups?notice=${notice}`);
        return;
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
              DHL 픽업 예약하기
            </p>
          </div>
          <AuthButtons />
        </div>

        <PickupRequestForm
          value={formValue}
          onChange={setFormValue}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isApproved={isApproved === true}
          approvalMessage={
            isApproved === false
              ? "승인된 사용자만 운송장 생성 및 픽업 요청이 가능합니다."
              : null
          }
        />

        {feedback && (
          <Alert
            className={
              feedback.variant === "ok"
                ? "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
                : "border-destructive/50 bg-destructive/10"
            }
          >
            <p className="text-sm whitespace-normal break-words leading-6">
              {formatFeedbackMessage(feedback.message)}
            </p>
          </Alert>
        )}
      </main>
    </FeaturePageShell>
  );
}
