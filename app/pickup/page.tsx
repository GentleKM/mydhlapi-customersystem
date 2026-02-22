// 별도의 픽업 예약만을 위한 전용 픽업 요청 페이지입니다.

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PickupRequestForm } from "@/components/PickupRequestForm";
import type { PickupRequestFormValue } from "@/components/PickupRequestForm";
import { AuthButtons } from "@/components/AuthButtons";
import { FloatHomeButton } from "@/components/FloatHomeButton";

/** PRD에 정의된 픽업 요청 페이지: 별도의 픽업 예약만을 위한 전용 화면입니다. */
export default function PickupPage() {
  const [isApproved, setIsApproved] = useState(false); // TODO: Supabase에서 승인 상태를 가져옵니다.
  const [formValue, setFormValue] = useState<PickupRequestFormValue>({
    accountName: "",
    address: "",
    contactNumber: "",
    pickupDate: "",
    note: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isApproved) {
      alert("승인 받은 사용자만 픽업 요청을 할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: MyDHL API와 연동하여 실제 픽업 요청을 전송합니다.
      console.log("픽업 요청 전송", formValue);
      await new Promise((resolve) => setTimeout(resolve, 1500)); // 시뮬레이션
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            픽업 요청
          </h1>
          <p className="text-muted-foreground">
            픽업 예약 정보를 입력하여 요청하세요.
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

      <PickupRequestForm
        value={formValue}
        onChange={setFormValue}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
      <FloatHomeButton />
    </main>
  );
}
