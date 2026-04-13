// MyDHL POST /pickups 스키마에 맞춘 픽업 요청 폼입니다.

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { PickupFormInput } from "@/lib/validations/pickup";

const COUNTRY_OPTIONS = [
  { code: "KR", name: "대한민국" },
  { code: "US", name: "미국" },
  { code: "JP", name: "일본" },
  { code: "CN", name: "중국" },
  { code: "GB", name: "영국" },
  { code: "DE", name: "독일" },
  { code: "FR", name: "프랑스" },
  { code: "SG", name: "싱가포르" },
  { code: "AU", name: "호주" },
  { code: "CA", name: "캐나다" },
] as const;

type NumericStringKeys =
  | "declaredValue"
  | "packageWeight"
  | "packageLength"
  | "packageWidth"
  | "packageHeight";

/** 폼 상태: 숫자 필드는 문자열로 편집합니다. */
export type PickupRequestFormValue = Omit<
  PickupFormInput,
  NumericStringKeys
> & {
  declaredValue: string;
  packageWeight: string;
  packageLength: string;
  packageWidth: string;
  packageHeight: string;
};

export const DEFAULT_PICKUP_FORM_VALUE: PickupRequestFormValue = {
  pickupDate: "",
  pickupTime: "09:00",
  closeTime: "18:00",
  location: "reception",
  shipperPostalCode: "",
  shipperCityName: "",
  shipperCountryCode: "KR",
  shipperAddressLine1: "",
  shipperAddressLine2: "",
  shipperPhone: "",
  shipperEmail: "",
  shipperCompanyName: "",
  shipperFullName: "",
  receiverPostalCode: "",
  receiverCityName: "",
  receiverCountryCode: "US",
  receiverAddressLine1: "",
  receiverAddressLine2: "",
  receiverPhone: "",
  receiverEmail: "",
  receiverCompanyName: "",
  receiverFullName: "",
  shipmentKind: "goods",
  declaredValue: "0",
  declaredValueCurrency: "EUR",
  packageWeight: "",
  packageLength: "",
  packageWidth: "",
  packageHeight: "",
  specialInstruction: "",
};

export interface PickupRequestFormProps {
  value: PickupRequestFormValue;
  onChange: (next: PickupRequestFormValue) => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  isApproved?: boolean;
}

/** Swagger `nonDocRequestPickup`에 대응하는 픽업 입력 UI입니다. */
export function PickupRequestForm({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  isApproved = false,
}: PickupRequestFormProps) {
  const set = <K extends keyof PickupRequestFormValue>(
    key: K,
    next: PickupRequestFormValue[K]
  ) => {
    onChange({ ...value, [key]: next });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <Card className="w-full bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base">픽업 요청 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="p-date">픽업 예정일 *</Label>
                <Input
                  id="p-date"
                  type="date"
                  value={value.pickupDate}
                  onChange={(e) => set("pickupDate", e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="p-time">픽업 예정 시각 (로컬) *</Label>
                <Input
                  id="p-time"
                  type="time"
                  value={value.pickupTime}
                  onChange={(e) => set("pickupTime", e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="p-close">현장 마감 시각 *</Label>
                <Input
                  id="p-close"
                  type="time"
                  value={value.closeTime}
                  onChange={(e) => set("closeTime", e.target.value)}
                  className="w-full"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5 w-full">
              <Label htmlFor="p-location">픽업 위치 설명 *</Label>
              <Input
                id="p-location"
                value={value.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="예: reception"
                maxLength={80}
                className="w-full"
                required
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              발송인
            </h3>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label>국가 *</Label>
                <Select
                  value={value.shipperCountryCode}
                  onValueChange={(v) => set("shipperCountryCode", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="sp-city">도시명 *</Label>
                <Input
                  id="sp-city"
                  className="w-full"
                  value={value.shipperCityName}
                  onChange={(e) => set("shipperCityName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="sp-postal">우편번호 *</Label>
                <Input
                  id="sp-postal"
                  className="w-full"
                  value={value.shipperPostalCode}
                  onChange={(e) => set("shipperPostalCode", e.target.value)}
                  maxLength={12}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5 w-full">
              <Label htmlFor="sp-a1">주소 1 *</Label>
              <Input
                id="sp-a1"
                className="w-full"
                value={value.shipperAddressLine1}
                onChange={(e) => set("shipperAddressLine1", e.target.value)}
                maxLength={45}
                required
              />
            </div>
            <div className="space-y-1.5 w-full">
              <Label htmlFor="sp-a2">주소 2 (선택)</Label>
              <Input
                id="sp-a2"
                className="w-full"
                value={value.shipperAddressLine2 ?? ""}
                onChange={(e) => set("shipperAddressLine2", e.target.value)}
                maxLength={45}
              />
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="sp-co">회사명 *</Label>
                <Input
                  id="sp-co"
                  className="w-full"
                  value={value.shipperCompanyName}
                  onChange={(e) => set("shipperCompanyName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="sp-fn">담당자 성명 *</Label>
                <Input
                  id="sp-fn"
                  className="w-full"
                  value={value.shipperFullName}
                  onChange={(e) => set("shipperFullName", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="sp-ph">전화 *</Label>
                <Input
                  id="sp-ph"
                  className="w-full"
                  value={value.shipperPhone}
                  onChange={(e) => set("shipperPhone", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="sp-em">이메일 (선택)</Label>
                <Input
                  id="sp-em"
                  type="email"
                  className="w-full"
                  value={value.shipperEmail ?? ""}
                  onChange={(e) => set("shipperEmail", e.target.value)}
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              수취인
            </h3>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label>국가 *</Label>
                <Select
                  value={value.receiverCountryCode}
                  onValueChange={(v) => set("receiverCountryCode", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="rv-city">도시명 *</Label>
                <Input
                  id="rv-city"
                  className="w-full"
                  value={value.receiverCityName}
                  onChange={(e) => set("receiverCityName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="rv-postal">우편번호 *</Label>
                <Input
                  id="rv-postal"
                  className="w-full"
                  value={value.receiverPostalCode}
                  onChange={(e) => set("receiverPostalCode", e.target.value)}
                  maxLength={12}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5 w-full">
              <Label htmlFor="rv-a1">주소 1 *</Label>
              <Input
                id="rv-a1"
                className="w-full"
                value={value.receiverAddressLine1}
                onChange={(e) => set("receiverAddressLine1", e.target.value)}
                maxLength={45}
                required
              />
            </div>
            <div className="space-y-1.5 w-full">
              <Label htmlFor="rv-a2">주소 2 (선택)</Label>
              <Input
                id="rv-a2"
                className="w-full"
                value={value.receiverAddressLine2 ?? ""}
                onChange={(e) => set("receiverAddressLine2", e.target.value)}
                maxLength={45}
              />
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="rv-co">회사명 *</Label>
                <Input
                  id="rv-co"
                  className="w-full"
                  value={value.receiverCompanyName}
                  onChange={(e) => set("receiverCompanyName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="rv-fn">수취인 성명 *</Label>
                <Input
                  id="rv-fn"
                  className="w-full"
                  value={value.receiverFullName}
                  onChange={(e) => set("receiverFullName", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="rv-ph">전화 *</Label>
                <Input
                  id="rv-ph"
                  className="w-full"
                  value={value.receiverPhone}
                  onChange={(e) => set("receiverPhone", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="rv-em">이메일 (선택)</Label>
                <Input
                  id="rv-em"
                  type="email"
                  className="w-full"
                  value={value.receiverEmail ?? ""}
                  onChange={(e) => set("receiverEmail", e.target.value)}
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">발송물</h3>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label>발송물 종류 *</Label>
                <Select
                  value={value.shipmentKind}
                  onValueChange={(v) =>
                    set(
                      "shipmentKind",
                      v as PickupRequestFormValue["shipmentKind"]
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goods">물품 (P)</SelectItem>
                    <SelectItem value="documents">문서 (D)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="p-dv">신고 가액 *</Label>
                <Input
                  id="p-dv"
                  type="number"
                  step="0.001"
                  min={0}
                  className="w-full"
                  value={value.declaredValue}
                  onChange={(e) => set("declaredValue", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="p-dvc">신고 가액 통화 *</Label>
                <Input
                  id="p-dvc"
                  className="w-full"
                  value={value.declaredValueCurrency}
                  onChange={(e) =>
                    set("declaredValueCurrency", e.target.value.toUpperCase())
                  }
                  maxLength={3}
                  placeholder="EUR"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="p-w">무게 (kg) *</Label>
                <Input
                  id="p-w"
                  type="number"
                  step="0.001"
                  min={0.001}
                  className="w-full"
                  value={value.packageWeight}
                  onChange={(e) => set("packageWeight", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="p-l">가로 *</Label>
                <Input
                  id="p-l"
                  type="number"
                  step="0.001"
                  min={1}
                  className="w-full"
                  value={value.packageLength}
                  onChange={(e) => set("packageLength", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="p-wd">세로 *</Label>
                <Input
                  id="p-wd"
                  type="number"
                  step="0.001"
                  min={1}
                  className="w-full"
                  value={value.packageWidth}
                  onChange={(e) => set("packageWidth", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="p-h">높이 *</Label>
                <Input
                  id="p-h"
                  type="number"
                  step="0.001"
                  min={1}
                  className="w-full"
                  value={value.packageHeight}
                  onChange={(e) => set("packageHeight", e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">특이사항</h3>
            <div className="space-y-1.5">
              <Label htmlFor="p-si">픽업 시 특이사항 (선택, 최대 80자)</Label>
              <Input
                id="p-si"
                value={value.specialInstruction ?? ""}
                onChange={(e) => set("specialInstruction", e.target.value)}
                maxLength={80}
                placeholder="예: please ring door bell"
              />
            </div>
          </section>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "요청 전송 중..." : isApproved ? "픽업 요청" : "승인 필요"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
