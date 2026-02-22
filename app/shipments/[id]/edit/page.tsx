// 운송장 수정 폼 페이지입니다. 생성 폼과 동일한 구조를 사용합니다.

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { getShipmentById, updateShipment } from "@/lib/actions/shipment";

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

export default function EditShipmentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [contentType, setContentType] = useState<ContentType>("goods");
  const [lineItems, setLineItems] = useState<LineItemFormData[]>([createEmptyLineItem()]);
  const [formData, setFormData] = useState({
    shipper: { name: "", address1: "", address2: "", postalCode: "", cityName: "" },
    receiver: {
      name: "", company: "", country: "", address1: "", address2: "",
      postalCode: "", cityName: "", email: "", phone: "",
    },
    package: { weight: "", length: "", width: "", height: "" },
    gogreenPlus: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getShipmentById(id).then(({ data, error }) => {
      setIsLoading(false);
      if (error) setLoadError(error);
      else if (data) {
        const s = data as Record<string, unknown>;
        setFormData({
          shipper: {
            name: (s.shipper_name as string) ?? "",
            address1: (s.shipper_address1 as string) ?? "",
            address2: (s.shipper_address2 as string) ?? "",
            postalCode: (s.shipper_postal_code as string) ?? "",
            cityName: (s.shipper_city as string) ?? "",
          },
          receiver: {
            name: (s.receiver_name as string) ?? "",
            company: (s.receiver_company as string) ?? "",
            country: (s.receiver_country as string) ?? "",
            address1: (s.receiver_address1 as string) ?? "",
            address2: (s.receiver_address2 as string) ?? "",
            postalCode: (s.receiver_postal_code as string) ?? "",
            cityName: (s.receiver_city as string) ?? "",
            email: (s.receiver_email as string) ?? "",
            phone: (s.receiver_phone as string) ?? "",
          },
          package: (() => {
            const p = (data as { package?: Record<string, unknown> }).package;
            return {
              weight: String(p?.weight ?? ""),
              length: String(p?.length ?? ""),
              width: String(p?.width ?? ""),
              height: String(p?.height ?? ""),
            };
          })(),
          gogreenPlus: (s.gogreen_plus as boolean) ?? false,
        });
        setContentType((s.content_type as ContentType) ?? "goods");
        const items = (data as { lineItems?: Array<Record<string, unknown>> }).lineItems ?? [];
        if (items.length > 0) {
          setLineItems(items.map((li) => ({
            exportReasonType: (li.export_reason_type as ExportReasonType) ?? "commercial",
            description: (li.description as string) ?? "",
            quantityValue: Number(li.quantity_value) || 1,
            quantityUnit: (li.quantity_unit as QuantityUnit) ?? "PCS",
            value: Number(li.value) || 0,
            weight: Number(li.weight_net ?? li.weight_gross) || 0,
            hsCode: (li.hs_code as string) ?? "",
            manufacturerCountry: (li.manufacturer_country as string) ?? "",
            customerReference: (li.customer_reference as string) ?? "",
          })));
        }
      }
    });
  }, [id]);

  const handleAiSuggestHsCode = async (itemName: string): Promise<HsCodeSuggestion[]> => {
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

  const addLineItem = () => setLineItems((p) => [...p, createEmptyLineItem()]);
  const removeLineItem = (i: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((p) => p.filter((_, idx) => idx !== i));
  };
  const updateLineItem = (i: number, u: Partial<LineItemFormData>) =>
    setLineItems((p) => p.map((item, idx) => (idx === i ? { ...item, ...u } : item)));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await updateShipment(id, {
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
      if (error) alert(`수정 실패: ${error}`);
      else router.push(`/shipments/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <p className="text-muted-foreground">로딩 중...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <p className="text-destructive">{loadError}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/shipments">목록으로</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">운송장 수정</h1>
          <p className="text-muted-foreground">운송장 정보를 수정하세요.</p>
        </div>
        <AuthButtons />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-base">발송인 정보</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>발송인 이름 *</Label>
              <Input value={formData.shipper.name} onChange={(e) => setFormData((p) => ({ ...p, shipper: { ...p.shipper, name: e.target.value } }))} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>주소 1 *</Label>
              <Input value={formData.shipper.address1} onChange={(e) => setFormData((p) => ({ ...p, shipper: { ...p.shipper, address1: e.target.value } }))} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>주소 2</Label>
              <Input value={formData.shipper.address2} onChange={(e) => setFormData((p) => ({ ...p, shipper: { ...p.shipper, address2: e.target.value } }))} />
            </div>
            <div className="space-y-2">
              <Label>우편번호 *</Label>
              <Input value={formData.shipper.postalCode} onChange={(e) => setFormData((p) => ({ ...p, shipper: { ...p.shipper, postalCode: e.target.value } }))} required />
            </div>
            <div className="space-y-2">
              <Label>도시명 *</Label>
              <Input value={formData.shipper.cityName} onChange={(e) => setFormData((p) => ({ ...p, shipper: { ...p.shipper, cityName: e.target.value } }))} required />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-base">수취인 정보</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>수취인 이름 *</Label><Input value={formData.receiver.name} onChange={(e) => setFormData((p) => ({ ...p, receiver: { ...p.receiver, name: e.target.value } }))} required /></div>
            <div className="space-y-2"><Label>수취인 회사명</Label><Input value={formData.receiver.company} onChange={(e) => setFormData((p) => ({ ...p, receiver: { ...p.receiver, company: e.target.value } }))} /></div>
            <div className="space-y-2"><Label>국가 *</Label>
              <Select value={formData.receiver.country} onValueChange={(v) => setFormData((p) => ({ ...p, receiver: { ...p.receiver, country: v } }))}>
                <SelectTrigger><SelectValue placeholder="국가 선택" /></SelectTrigger>
                <SelectContent>{COUNTRY_OPTIONS.map((c) => <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2"><Label>주소 1 *</Label><Input value={formData.receiver.address1} onChange={(e) => setFormData((p) => ({ ...p, receiver: { ...p.receiver, address1: e.target.value } }))} required /></div>
            <div className="space-y-2 sm:col-span-2"><Label>주소 2</Label><Input value={formData.receiver.address2} onChange={(e) => setFormData((p) => ({ ...p, receiver: { ...p.receiver, address2: e.target.value } }))} /></div>
            <div className="space-y-2"><Label>우편번호 *</Label><Input value={formData.receiver.postalCode} onChange={(e) => setFormData((p) => ({ ...p, receiver: { ...p.receiver, postalCode: e.target.value } }))} required /></div>
            <div className="space-y-2"><Label>도시명 *</Label><Input value={formData.receiver.cityName} onChange={(e) => setFormData((p) => ({ ...p, receiver: { ...p.receiver, cityName: e.target.value } }))} required /></div>
            <div className="space-y-2"><Label>이메일 주소 *</Label><Input type="email" value={formData.receiver.email} onChange={(e) => setFormData((p) => ({ ...p, receiver: { ...p.receiver, email: e.target.value } }))} required /></div>
            <div className="space-y-2"><Label>전화번호 *</Label><Input type="tel" value={formData.receiver.phone} onChange={(e) => setFormData((p) => ({ ...p, receiver: { ...p.receiver, phone: e.target.value } }))} required /></div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-base">물품 정보</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>서류 or 물품 구분 *</Label>
              <RadioGroup value={contentType} onValueChange={(v) => setContentType(v as ContentType)} className="flex gap-6">
                <div className="flex items-center gap-2"><RadioGroupItem value="documents" id="ct-doc" /><Label htmlFor="ct-doc" className="font-normal cursor-pointer">서류</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="goods" id="ct-goods" /><Label htmlFor="ct-goods" className="font-normal cursor-pointer">물품</Label></div>
              </RadioGroup>
            </div>
            {contentType === "goods" && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex justify-between items-center"><Label>상세 물품 정보</Label><Button type="button" variant="outline" size="sm" onClick={addLineItem}>+ 품목 추가</Button></div>
                {lineItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg border-2 border-border bg-white dark:bg-card p-4 space-y-4">
                    <div className="flex justify-between"><span className="text-sm font-medium">품목 {idx + 1}</span>{lineItems.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(idx)}>삭제</Button>}</div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2"><Label>발송물 종류 *</Label><Select value={item.exportReasonType} onValueChange={(v) => updateLineItem(idx, { exportReasonType: v as ExportReasonType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sample">Sample</SelectItem><SelectItem value="repair">Repair</SelectItem><SelectItem value="commercial">Commercial</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2 sm:col-span-2"><Label>발송물 정보 (설명) *</Label><Input placeholder="ex. shoes nike A123" value={item.description} onChange={(e) => updateLineItem(idx, { description: e.target.value })} required /></div>
                      <div className="space-y-2"><Label>수량 *</Label><Input type="number" min={1} value={item.quantityValue || ""} onChange={(e) => updateLineItem(idx, { quantityValue: parseInt(e.target.value, 10) || 0 })} /></div>
                      <div className="space-y-2"><Label>단위 *</Label><Select value={item.quantityUnit} onValueChange={(v) => updateLineItem(idx, { quantityUnit: v as QuantityUnit })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{QUANTITY_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Value (금액) *</Label><Input type="number" step="0.001" min={0} value={item.value || ""} onChange={(e) => updateLineItem(idx, { value: parseFloat(e.target.value) || 0 })} /></div>
                      <div className="space-y-2"><Label>Weight (kg) *</Label><Input type="number" step="0.001" min={0} value={item.weight || ""} onChange={(e) => updateLineItem(idx, { weight: parseFloat(e.target.value) || 0 })} /></div>
                      <HsCodeFieldWithAi label="HS 코드 (선택)" value={item.hsCode ?? ""} onChange={(hsCode) => updateLineItem(idx, { hsCode })} onSuggestHsCode={handleAiSuggestHsCode} itemDescription={item.description} />
                      <div className="space-y-2"><Label>제작 국가(원산지)</Label><Select value={item.manufacturerCountry || ""} onValueChange={(v) => updateLineItem(idx, { manufacturerCountry: v || undefined })}><SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger><SelectContent>{COUNTRY_OPTIONS.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2 sm:col-span-2"><Label>발송물 참조사항</Label><Input placeholder="운송장에 표기할 텍스트" value={item.customerReference ?? ""} onChange={(e) => updateLineItem(idx, { customerReference: e.target.value })} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-base">포장 정보</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>무게 (kg) *</Label><Input type="number" step="0.001" min={0.001} value={formData.package.weight} onChange={(e) => setFormData((p) => ({ ...p, package: { ...p.package, weight: e.target.value } }))} required /></div>
            <div className="space-y-2"><Label>길이 (cm) *</Label><Input type="number" step="0.001" min={1} value={formData.package.length} onChange={(e) => setFormData((p) => ({ ...p, package: { ...p.package, length: e.target.value } }))} required /></div>
            <div className="space-y-2"><Label>너비 (cm) *</Label><Input type="number" step="0.001" min={1} value={formData.package.width} onChange={(e) => setFormData((p) => ({ ...p, package: { ...p.package, width: e.target.value } }))} required /></div>
            <div className="space-y-2"><Label>높이 (cm) *</Label><Input type="number" step="0.001" min={1} value={formData.package.height} onChange={(e) => setFormData((p) => ({ ...p, package: { ...p.package, height: e.target.value } }))} required /></div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-base">부가서비스</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><Checkbox id="gg" checked={formData.gogreenPlus} onCheckedChange={(c) => setFormData((p) => ({ ...p, gogreenPlus: c === true }))} /><Label htmlFor="gg" className="font-normal cursor-pointer">GoGreen Plus</Label></div></CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button asChild variant="outline"><Link href={`/shipments/${id}`}>취소</Link></Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "수정 중..." : "수정 완료"}</Button>
        </div>
      </form>
      <FloatHomeButton />
    </main>
  );
}
