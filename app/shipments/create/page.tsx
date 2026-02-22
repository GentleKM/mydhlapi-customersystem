// 필수 필드 입력 폼과 AI 입력 기능을 제공하는 운송장 생성 페이지입니다.

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { HsCodeFieldWithAi } from "@/components/HsCodeFieldWithAi";
import type { HsCodeSuggestion } from "@/components/AiShipmentAssistant";
import { AuthButtons } from "@/components/AuthButtons";
import { FloatHomeButton } from "@/components/FloatHomeButton";
import {
  type ContentType,
  type ExportReasonType,
  type LineItemFormData,
  type QuantityUnit,
  QUANTITY_UNITS,
} from "@/lib/shipment-types";
import {
  createShipment,
  getIsApproved,
} from "@/lib/actions/shipment";

/** 주요 국가 코드 (ISO 3166-1 Alpha-2) */
const COUNTRY_OPTIONS = [
  { code: "US", name: "미국" },
  { code: "JP", name: "일본" },
  { code: "CN", name: "중국" },
  { code: "GB", name: "영국" },
  { code: "DE", name: "독일" },
  { code: "KR", name: "대한민국" },
  { code: "FR", name: "프랑스" },
  { code: "SG", name: "싱가포르" },
  { code: "AU", name: "호주" },
  { code: "CA", name: "캐나다" },
];

const createEmptyLineItem = (): LineItemFormData => ({
  exportReasonType: "commercial",
  description: "",
  quantityValue: 1,
  quantityUnit: "PCS",
  value: 0,
  weight: 0,
  hsCode: "",
  manufacturerCountry: "",
  customerReference: "",
});

/** PRD에 정의된 운송장 생성 페이지: 필수 필드 입력 폼 및 AI 입력 기능을 제공합니다. */
export default function CreateShipmentPage() {
  const router = useRouter();
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    getIsApproved().then(setIsApproved);
  }, []);
  const [contentType, setContentType] = useState<ContentType>("goods");
  const [lineItems, setLineItems] = useState<LineItemFormData[]>([createEmptyLineItem()]);
  const [formData, setFormData] = useState({
    shipper: {
      name: "",
      address1: "",
      address2: "",
      postalCode: "",
      cityName: "",
    },
    receiver: {
      name: "",
      company: "",
      country: "",
      address1: "",
      address2: "",
      postalCode: "",
      cityName: "",
      email: "",
      phone: "",
    },
    package: {
      weight: "",
      length: "",
      width: "",
      height: "",
    },
    gogreenPlus: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAiSuggestHsCode = async (
    itemName: string
  ): Promise<HsCodeSuggestion[]> => {
    const res = await fetch("/api/hs-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemName: itemName.trim(),
        destinationCountry: formData.receiver.country || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "HS 코드 추천에 실패했습니다.");
    }
    return data.suggestions ?? [];
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, createEmptyLineItem()]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, updates: Partial<LineItemFormData>) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isApproved) {
      alert("승인 받은 사용자만 운송장을 생성할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { id, error } = await createShipment({
        shipper: formData.shipper,
        receiver: formData.receiver,
        contentType,
        lineItems: contentType === "goods" ? lineItems : [],
        package: {
          weight: parseFloat(formData.package.weight) || 0,
          length: parseFloat(formData.package.length) || 0,
          width: parseFloat(formData.package.width) || 0,
          height: parseFloat(formData.package.height) || 0,
        },
        gogreenPlus: formData.gogreenPlus,
      });
      if (error) {
        alert(`운송장 생성 실패: ${error}`);
        return;
      }
      if (id) router.push(`/shipments/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            운송장 생성
          </h1>
          <p className="text-muted-foreground">
            필수 정보를 입력하여 새로운 운송장을 생성하세요.
          </p>
        </div>
        <AuthButtons />
      </div>

      {!isApproved && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <p className="col-start-2 col-span-1 text-sm text-yellow-900 dark:text-yellow-100">
            승인 받은 사용자만 운송장 생성 및 픽업 요청이 가능합니다.
          </p>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 발송인 정보 */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">발송인 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="shipper-name">발송인 이름 *</Label>
              <Input
                id="shipper-name"
                value={formData.shipper.name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shipper: { ...prev.shipper, name: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="shipper-address1">주소 1 *</Label>
              <Input
                id="shipper-address1"
                value={formData.shipper.address1}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shipper: { ...prev.shipper, address1: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="shipper-address2">주소 2</Label>
              <Input
                id="shipper-address2"
                value={formData.shipper.address2}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shipper: { ...prev.shipper, address2: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipper-postalCode">우편번호 *</Label>
              <Input
                id="shipper-postalCode"
                value={formData.shipper.postalCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shipper: { ...prev.shipper, postalCode: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipper-cityName">도시명 *</Label>
              <Input
                id="shipper-cityName"
                value={formData.shipper.cityName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shipper: { ...prev.shipper, cityName: e.target.value },
                  }))
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* 수취인 정보 */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">수취인 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="receiver-name">수취인 이름 *</Label>
              <Input
                id="receiver-name"
                value={formData.receiver.name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    receiver: { ...prev.receiver, name: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver-company">수취인 회사명</Label>
              <Input
                id="receiver-company"
                value={formData.receiver.company}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    receiver: { ...prev.receiver, company: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver-country">국가 *</Label>
              <Select
                value={formData.receiver.country}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    receiver: { ...prev.receiver, country: value },
                  }))
                }
              >
                <SelectTrigger id="receiver-country">
                  <SelectValue placeholder="국가 선택" />
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="receiver-address1">주소 1 *</Label>
              <Input
                id="receiver-address1"
                value={formData.receiver.address1}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    receiver: { ...prev.receiver, address1: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="receiver-address2">주소 2</Label>
              <Input
                id="receiver-address2"
                value={formData.receiver.address2}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    receiver: { ...prev.receiver, address2: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver-postalCode">우편번호 *</Label>
              <Input
                id="receiver-postalCode"
                value={formData.receiver.postalCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    receiver: { ...prev.receiver, postalCode: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver-cityName">도시명 *</Label>
              <Input
                id="receiver-cityName"
                value={formData.receiver.cityName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    receiver: { ...prev.receiver, cityName: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver-email">이메일 주소 *</Label>
              <Input
                id="receiver-email"
                type="email"
                value={formData.receiver.email}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    receiver: { ...prev.receiver, email: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiver-phone">전화번호 *</Label>
              <Input
                id="receiver-phone"
                type="tel"
                value={formData.receiver.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    receiver: { ...prev.receiver, phone: e.target.value },
                  }))
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* 물품 정보 */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">물품 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>서류 or 물품 구분 *</Label>
              <RadioGroup
                value={contentType}
                onValueChange={(v) => setContentType(v as ContentType)}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="documents" id="ct-documents" />
                  <Label htmlFor="ct-documents" className="font-normal cursor-pointer">
                    서류
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="goods" id="ct-goods" />
                  <Label htmlFor="ct-goods" className="font-normal cursor-pointer">
                    물품
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {contentType === "goods" && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label>상세 물품 정보 (패키지 내 품목)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLineItem}
                  >
                    + 품목 추가
                  </Button>
                </div>
                {lineItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border-2 border-border bg-white dark:bg-card p-4 space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">품목 {idx + 1}</span>
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(idx)}
                        >
                          삭제
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>발송물 종류 *</Label>
                        <Select
                          value={item.exportReasonType}
                          onValueChange={(v) =>
                            updateLineItem(idx, {
                              exportReasonType: v as ExportReasonType,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sample">Sample</SelectItem>
                            <SelectItem value="repair">Repair</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>발송물 정보 (설명) *</Label>
                        <Input
                          placeholder="ex. shoes nike A123 leather exercise"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(idx, { description: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>수량 *</Label>
                        <Input
                          type="number"
                          min={1}
                          max={1000000000}
                          value={item.quantityValue || ""}
                          onChange={(e) =>
                            updateLineItem(idx, {
                              quantityValue: parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>단위 *</Label>
                        <Select
                          value={item.quantityUnit}
                          onValueChange={(v) =>
                            updateLineItem(idx, {
                              quantityUnit: v as QuantityUnit,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUANTITY_UNITS.map((u) => (
                              <SelectItem key={u} value={u}>
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Value (금액) *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          min={0}
                          value={item.value || ""}
                          onChange={(e) =>
                            updateLineItem(idx, {
                              value: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Weight (kg) *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          min={0}
                          value={item.weight || ""}
                          onChange={(e) =>
                            updateLineItem(idx, {
                              weight: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <HsCodeFieldWithAi
                        label="HS 코드 (선택)"
                        value={item.hsCode ?? ""}
                        onChange={(hsCode) =>
                          updateLineItem(idx, { hsCode })
                        }
                        onSuggestHsCode={handleAiSuggestHsCode}
                        itemDescription={item.description}
                      />
                      <div className="space-y-2">
                        <Label>제작 국가(원산지)</Label>
                        <Select
                          value={item.manufacturerCountry || ""}
                          onValueChange={(v) =>
                            updateLineItem(idx, {
                              manufacturerCountry: v || undefined,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="선택" />
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
                      <div className="space-y-2 sm:col-span-2">
                        <Label>발송물 참조사항</Label>
                        <Input
                          placeholder="운송장에 표기할 텍스트"
                          value={item.customerReference}
                          onChange={(e) =>
                            updateLineItem(idx, {
                              customerReference: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 포장 정보 */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">포장 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pkg-weight">무게 (kg) *</Label>
              <Input
                id="pkg-weight"
                type="number"
                step="0.001"
                min={0.001}
                value={formData.package.weight}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    package: { ...prev.package, weight: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-length">길이 (cm) *</Label>
              <Input
                id="pkg-length"
                type="number"
                step="0.001"
                min={1}
                value={formData.package.length}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    package: { ...prev.package, length: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-width">너비 (cm) *</Label>
              <Input
                id="pkg-width"
                type="number"
                step="0.001"
                min={1}
                value={formData.package.width}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    package: { ...prev.package, width: e.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-height">높이 (cm) *</Label>
              <Input
                id="pkg-height"
                type="number"
                step="0.001"
                min={1}
                value={formData.package.height}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    package: { ...prev.package, height: e.target.value },
                  }))
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* 부가서비스 */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">부가서비스</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Checkbox
                id="gogreen"
                checked={formData.gogreenPlus}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    gogreenPlus: checked === true,
                  }))
                }
              />
              <Label htmlFor="gogreen" className="font-normal cursor-pointer">
                GoGreen Plus
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting || !isApproved}>
            {isSubmitting
              ? "생성 중..."
              : isApproved
                ? "운송장 생성하기"
                : "승인 필요"}
          </Button>
        </div>
      </form>
      <FloatHomeButton />
    </main>
  );
}
