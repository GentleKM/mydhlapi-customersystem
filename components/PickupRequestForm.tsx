// 픽업 예약 전용 화면에서 사용할 기본 픽업 요청 폼 컴포넌트입니다.

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface PickupRequestFormValue {
  /** 픽업을 요청하는 고객사 이름입니다. */
  accountName: string;
  /** 픽업 주소입니다. */
  address: string;
  /** 연락처(전화번호)입니다. */
  contactNumber: string;
  /** 희망 픽업 일자입니다. */
  pickupDate: string;
  /** 비고/추가 요청사항입니다. */
  note?: string;
}

export interface PickupRequestFormProps {
  /** 현재 폼 값입니다. (상위 상태와 연결됩니다.) */
  value: PickupRequestFormValue;
  /** 폼 값이 변경될 때 호출되는 콜백입니다. */
  onChange: (next: PickupRequestFormValue) => void;
  /** 폼 제출 시 호출되는 콜백입니다. */
  onSubmit?: () => void;
  /** 제출 진행 중 상태입니다. */
  isSubmitting?: boolean;
}

/** PRD의 픽업 요청 전용 페이지에서 사용할 공통 픽업 폼 UI 컴포넌트입니다. */
export function PickupRequestForm({
  value,
  onChange,
  onSubmit,
  isSubmitting,
}: PickupRequestFormProps) {
  const handleFieldChange = <K extends keyof PickupRequestFormValue>(
    key: K,
    next: PickupRequestFormValue[K],
  ) => {
    onChange({ ...value, [key]: next });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <Card className="max-w-2xl bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base">픽업 요청 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pickup-account-name">고객사명</Label>
            <Input
              id="pickup-account-name"
              value={value.accountName}
              onChange={(event) =>
                handleFieldChange("accountName", event.target.value)
              }
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pickup-address">픽업 주소</Label>
            <Textarea
              id="pickup-address"
              value={value.address}
              onChange={(event) =>
                handleFieldChange("address", event.target.value)
              }
              rows={2}
              required
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pickup-contact-number">연락처</Label>
              <Input
                id="pickup-contact-number"
                value={value.contactNumber}
                onChange={(event) =>
                  handleFieldChange("contactNumber", event.target.value)
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pickup-date">희망 픽업 일자</Label>
              <Input
                id="pickup-date"
                type="date"
                value={value.pickupDate}
                onChange={(event) =>
                  handleFieldChange("pickupDate", event.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pickup-note">추가 요청사항 (선택)</Label>
            <Textarea
              id="pickup-note"
              value={value.note ?? ""}
              onChange={(event) =>
                handleFieldChange("note", event.target.value || undefined)
              }
              rows={2}
              placeholder="예: 특수 포장 필요, 사전 연락 요청 등"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "요청 전송 중..." : "픽업 요청 보내기"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

