// 목적지별 견적(POST /rates) 및 Landed Cost(POST /landed-cost) 조회 페이지입니다.

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthButtons } from "@/components/AuthButtons";
import { FeaturePageShell } from "@/components/FeaturePageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  requestDhlLandedCost,
  requestDhlRates,
  type QuoteLandedCostInput,
  type QuoteRatesInput,
} from "@/lib/actions/quote";

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
];

const CURRENCY_OPTIONS = ["KRW", "USD", "EUR", "JPY", "GBP", "AUD"] as const;

/** PRD: 견적·Landed Cost 조회 UI입니다. */
export default function QuotePage() {
  const [originCountry, setOriginCountry] = useState("");
  const [originPostalCode, setOriginPostalCode] = useState("");
  const [originCityName, setOriginCityName] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [destinationPostalCode, setDestinationPostalCode] = useState("");
  const [destinationCityName, setDestinationCityName] = useState("");
  const [weight, setWeight] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [plannedDate, setPlannedDate] = useState("");

  const [isCustomsDeclarable, setIsCustomsDeclarable] = useState(false);
  const [declaredValue, setDeclaredValue] = useState("");
  const [declaredCurrency, setDeclaredCurrency] = useState("USD");

  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [manufacturerCountry, setManufacturerCountry] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [unitPriceCurrency, setUnitPriceCurrency] = useState("USD");
  const [commodityCode, setCommodityCode] = useState("");
  const [itemWeightKg, setItemWeightKg] = useState("");

  const [ratesResult, setRatesResult] = useState<unknown | null>(null);
  const [landedResult, setLandedResult] = useState<unknown | null>(null);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [landedError, setLandedError] = useState<string | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [isLoadingLanded, setIsLoadingLanded] = useState(false);

  const buildCommonPayload = (): Omit<
    QuoteRatesInput,
    "isCustomsDeclarable" | "declaredValue" | "declaredCurrency"
  > | null => {
    const w = parseFloat(weight);
    const l = parseFloat(lengthCm);
    const wi = parseFloat(widthCm);
    const h = parseFloat(heightCm);
    if (
      !originCountry ||
      !originPostalCode.trim() ||
      !originCityName.trim() ||
      !destinationCountry ||
      !destinationPostalCode.trim() ||
      !destinationCityName.trim() ||
      !plannedDate ||
      Number.isNaN(w) ||
      Number.isNaN(l) ||
      Number.isNaN(wi) ||
      Number.isNaN(h)
    ) {
      return null;
    }
    return {
      originPostalCode: originPostalCode.trim(),
      originCityName: originCityName.trim(),
      originCountry,
      destinationPostalCode: destinationPostalCode.trim(),
      destinationCityName: destinationCityName.trim(),
      destinationCountry,
      weightKg: w,
      lengthCm: l,
      widthCm: wi,
      heightCm: h,
      plannedDate,
    };
  };

  const validateCommonMessages = (): string[] => {
    const msgs: string[] = [];
    if (!originCountry) msgs.push("출발 국가");
    if (!originPostalCode.trim()) msgs.push("출발 우편번호");
    if (!originCityName.trim()) msgs.push("출발 도시명");
    if (!destinationCountry) msgs.push("도착 국가");
    if (!destinationPostalCode.trim()) msgs.push("도착 우편번호");
    if (!destinationCityName.trim()) msgs.push("도착 도시명");
    if (!weight.trim() || parseFloat(weight) <= 0) msgs.push("무게(kg)");
    if (!lengthCm.trim() || parseFloat(lengthCm) < 1) msgs.push("가로(cm)");
    if (!widthCm.trim() || parseFloat(widthCm) < 1) msgs.push("세로(cm)");
    if (!heightCm.trim() || parseFloat(heightCm) < 1) msgs.push("높이(cm)");
    if (!plannedDate) msgs.push("발송 예정일");
    return msgs;
  };

  const handleRates = async () => {
    const missing = validateCommonMessages();
    if (missing.length > 0) {
      alert(
        `다음 정보를 입력해 주세요:\n${missing.map((m) => `· ${m}`).join("\n")}`
      );
      return;
    }
    if (isCustomsDeclarable) {
      const dv = parseFloat(declaredValue);
      if (!declaredValue.trim() || Number.isNaN(dv) || dv < 0) {
        alert("관세 신고 물품인 경우 신고 가액을 입력해 주세요.");
        return;
      }
      if (!declaredCurrency.trim()) {
        alert("관세 신고 물품인 경우 신고 가액 통화를 선택해 주세요.");
        return;
      }
    }

    const base = buildCommonPayload();
    if (!base) return;

    setIsLoadingRates(true);
    setRatesError(null);
    setRatesResult(null);
    try {
      const input: QuoteRatesInput = {
        ...base,
        isCustomsDeclarable,
        declaredValue: isCustomsDeclarable
          ? parseFloat(declaredValue)
          : undefined,
        declaredCurrency: isCustomsDeclarable ? declaredCurrency : undefined,
      };
      const { data, error } = await requestDhlRates(input);
      if (error) {
        setRatesError(error);
        return;
      }
      setRatesResult(data);
    } finally {
      setIsLoadingRates(false);
    }
  };

  const handleLanded = async () => {
    const missing = validateCommonMessages();
    const landedMissing: string[] = [];
    if (!itemName.trim()) landedMissing.push("품목명");
    if (!itemDescription.trim()) landedMissing.push("품목 설명");
    if (!manufacturerCountry) landedMissing.push("제조 국가");
    const q = parseFloat(itemQuantity);
    if (!itemQuantity.trim() || Number.isNaN(q) || q <= 0) {
      landedMissing.push("품목 수량");
    }
    const up = parseFloat(unitPrice);
    if (!unitPrice.trim() || Number.isNaN(up) || up < 0) {
      landedMissing.push("품목 단가");
    }
    if (!unitPriceCurrency.trim()) landedMissing.push("통화");
    if (!commodityCode.trim()) landedMissing.push("HS 코드(품목)");
    const iw = parseFloat(itemWeightKg);
    if (!itemWeightKg.trim() || Number.isNaN(iw) || iw <= 0) {
      landedMissing.push("품목 무게(kg)");
    }

    const all = [...missing, ...landedMissing];
    if (all.length > 0) {
      alert(`다음 정보를 입력해 주세요:\n${all.map((m) => `· ${m}`).join("\n")}`);
      return;
    }

    const base = buildCommonPayload();
    if (!base) return;

    setIsLoadingLanded(true);
    setLandedError(null);
    setLandedResult(null);
    try {
      const input: QuoteLandedCostInput = {
        ...base,
        isCustomsDeclarable,
        declaredValue: isCustomsDeclarable
          ? parseFloat(declaredValue)
          : undefined,
        declaredCurrency: isCustomsDeclarable ? declaredCurrency : undefined,
        currencyCode: unitPriceCurrency,
        itemName: itemName.trim(),
        itemDescription: itemDescription.trim(),
        manufacturerCountry,
        quantity: q,
        unitPrice: up,
        unitPriceCurrencyCode: unitPriceCurrency,
        commodityCode: commodityCode.trim(),
        itemWeightKg: iw,
      };
      const { data, error } = await requestDhlLandedCost(input);
      if (error) {
        setLandedError(error);
        return;
      }
      setLandedResult(data);
    } finally {
      setIsLoadingLanded(false);
    }
  };

  return (
    <FeaturePageShell>
    <main className="max-w-4xl mx-auto w-full space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            견적 조회
          </h1>
          <p className="text-muted-foreground">
            예상 운임 및 Landed Cost 조회하기
          </p>
        </div>
        <AuthButtons />
      </div>

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">견적 조회</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* 출발: 국가 · 도시명 · 우편번호 한 줄(모바일은 세로 스택) */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="origin-country">
                  출발 국가 <span className="text-destructive">*</span>
                </Label>
                <Select value={originCountry} onValueChange={setOriginCountry}>
                  <SelectTrigger id="origin-country" className="w-full">
                    <SelectValue placeholder="출발 국가 선택" />
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
                <Label htmlFor="origin-city">
                  출발 도시명 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="origin-city"
                  className="w-full"
                  value={originCityName}
                  onChange={(e) => setOriginCityName(e.target.value)}
                  placeholder="예: SEOUL"
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="origin-postal">
                  출발 우편번호 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="origin-postal"
                  className="w-full"
                  value={originPostalCode}
                  onChange={(e) => setOriginPostalCode(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="dest-country">
                  도착 국가 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={destinationCountry}
                  onValueChange={setDestinationCountry}
                >
                  <SelectTrigger id="dest-country" className="w-full">
                    <SelectValue placeholder="도착 국가 선택" />
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
                <Label htmlFor="dest-city">
                  도착 도시명 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dest-city"
                  className="w-full"
                  value={destinationCityName}
                  onChange={(e) => setDestinationCityName(e.target.value)}
                  placeholder="예: TOKYO"
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="dest-postal">
                  도착 우편번호 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dest-postal"
                  className="w-full"
                  value={destinationPostalCode}
                  onChange={(e) => setDestinationPostalCode(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5 min-w-0 flex flex-col">
              <Label htmlFor="weight">
                무게 (kg) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="weight"
                className="w-full"
                type="number"
                step="0.001"
                min={0.001}
                placeholder="예: 2.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 min-w-0 flex flex-col">
              <Label htmlFor="planned-date">
                발송 예정일 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="planned-date"
                className="w-full"
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="space-y-1.5 min-w-0 flex flex-col">
              <Label htmlFor="len">
                가로 (cm) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="len"
                className="w-full"
                type="number"
                step="0.001"
                min={1}
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 min-w-0 flex flex-col">
              <Label htmlFor="wid">
                세로 (cm) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wid"
                className="w-full"
                type="number"
                step="0.001"
                min={1}
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 min-w-0 flex flex-col">
              <Label htmlFor="hei">
                높이 (cm) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hei"
                className="w-full"
                type="number"
                step="0.001"
                min={1}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-sm font-medium">견적 조회 전용</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="customs"
                checked={isCustomsDeclarable}
                onCheckedChange={(c) => setIsCustomsDeclarable(c === true)}
              />
              <Label htmlFor="customs" className="font-normal cursor-pointer">
                관세 신고 물품(과세/신고 대상)
              </Label>
            </div>
            {isCustomsDeclarable && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="declared-val">신고 가액</Label>
                  <Input
                    id="declared-val"
                    type="number"
                    step="0.001"
                    min={0}
                    value={declaredValue}
                    onChange={(e) => setDeclaredValue(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="declared-ccy">신고 가액 통화</Label>
                  <Select
                    value={declaredCurrency}
                    onValueChange={setDeclaredCurrency}
                  >
                    <SelectTrigger id="declared-ccy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-4 space-y-4">
            <CardTitle className="text-base">Landed Cost 조회</CardTitle>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="iname">품목명</Label>
                <Input
                  id="iname"
                  className="w-full"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="idesc">품목 설명</Label>
                <Input
                  id="idesc"
                  className="w-full"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="mfg">제조 국가</Label>
                <Select
                  value={manufacturerCountry}
                  onValueChange={setManufacturerCountry}
                >
                  <SelectTrigger id="mfg" className="w-full">
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
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="iqty">품목 수량</Label>
                <Input
                  id="iqty"
                  className="w-full"
                  type="number"
                  min={1}
                  step="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="hs">HS 코드 (품목)</Label>
                <Input
                  id="hs"
                  className="w-full"
                  placeholder="숫자만"
                  value={commodityCode}
                  onChange={(e) => setCommodityCode(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="up">품목 단가</Label>
                <Input
                  id="up"
                  className="w-full"
                  type="number"
                  step="0.01"
                  min={0}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label>통화</Label>
                <Select
                  value={unitPriceCurrency}
                  onValueChange={setUnitPriceCurrency}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0 flex flex-col">
                <Label htmlFor="iw">품목 무게 (kg)</Label>
                <Input
                  id="iw"
                  className="w-full"
                  type="number"
                  step="0.001"
                  min={0.001}
                  value={itemWeightKg}
                  onChange={(e) => setItemWeightKg(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={handleRates}
              disabled={isLoadingRates}
              className="flex-1"
            >
              {isLoadingRates ? "견적 조회 중..." : "견적 조회"}
            </Button>
            <Button
              type="button"
              onClick={handleLanded}
              disabled={isLoadingLanded}
              className="flex-1"
            >
              {isLoadingLanded ? "Landed Cost 조회 중..." : "Landed Cost 조회"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {(ratesResult || ratesError) && (
        <Card className="bg-card/80 backdrop-blur-sm mt-6">
          <CardHeader>
            <CardTitle className="text-base">견적 조회 결과</CardTitle>
          </CardHeader>
          <CardContent>
            {ratesError ? (
              <p className="text-sm text-destructive whitespace-pre-wrap">
                {ratesError}
              </p>
            ) : (
              <pre className="text-xs overflow-auto max-h-[420px] rounded-md bg-muted/50 p-3">
                {JSON.stringify(ratesResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {(landedResult || landedError) && (
        <Card className="bg-card/80 backdrop-blur-sm mt-6">
          <CardHeader>
            <CardTitle className="text-base">Landed Cost 조회 결과</CardTitle>
          </CardHeader>
          <CardContent>
            {landedError ? (
              <p className="text-sm text-destructive whitespace-pre-wrap">
                {landedError}
              </p>
            ) : (
              <pre className="text-xs overflow-auto max-h-[420px] rounded-md bg-muted/50 p-3">
                {JSON.stringify(landedResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

    </main>
    </FeaturePageShell>
  );
}
