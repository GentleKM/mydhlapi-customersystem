// 목적지별 견적 산출 및 발송 가능 지역 여부를 확인하는 견적 조회 페이지입니다.

"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthButtons } from "@/components/AuthButtons";
import { FloatHomeButton } from "@/components/FloatHomeButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

/** PRD에 정의된 견적 조회 및 발송 가능 확인 페이지입니다. */
export default function QuotePage() {
  const [originCountry, setOriginCountry] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [weight, setWeight] = useState("");
  const [quoteResult, setQuoteResult] = useState<{
    available: boolean;
    estimatedCost?: number;
    estimatedDays?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // TODO: MyDHL API와 연동하여 실제 견적을 조회합니다.
  const handleGetQuote = async () => {
    if (!originCountry || !destinationCountry || !weight) return;

    setIsLoading(true);
    try {
      // 여기에 MyDHL API 호출 로직을 구현합니다.
      // 예: await getQuoteFromDHL({ originCountry, destinationCountry, weight })
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 시뮬레이션

      setQuoteResult({
        available: true,
        estimatedCost: 45000,
        estimatedDays: 3,
      });
    } catch (error) {
      setQuoteResult({
        available: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            견적 조회 및 발송 가능 확인
          </h1>
          <p className="text-muted-foreground">
            목적지별 운임 견적을 산출하고 발송 가능 지역 여부를 확인하세요.
          </p>
        </div>
        <AuthButtons />
      </div>

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">견적 정보 입력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="origin-country">출발 국가</Label>
              <Select value={originCountry} onValueChange={setOriginCountry}>
                <SelectTrigger id="origin-country">
                  <SelectValue placeholder="출발 국가 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KR">대한민국 (KR)</SelectItem>
                  <SelectItem value="US">미국 (US)</SelectItem>
                  <SelectItem value="JP">일본 (JP)</SelectItem>
                  <SelectItem value="CN">중국 (CN)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="destination-country">도착 국가</Label>
              <Select
                value={destinationCountry}
                onValueChange={setDestinationCountry}
              >
                <SelectTrigger id="destination-country">
                  <SelectValue placeholder="도착 국가 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KR">대한민국 (KR)</SelectItem>
                  <SelectItem value="US">미국 (US)</SelectItem>
                  <SelectItem value="JP">일본 (JP)</SelectItem>
                  <SelectItem value="CN">중국 (CN)</SelectItem>
                  <SelectItem value="GB">영국 (GB)</SelectItem>
                  <SelectItem value="DE">독일 (DE)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="weight">무게 (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="0.1"
              placeholder="예: 2.5"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
          </div>

          <Button
            onClick={handleGetQuote}
            disabled={isLoading || !originCountry || !destinationCountry || !weight}
            className="w-full"
          >
            {isLoading ? "견적 조회 중..." : "견적 조회하기"}
          </Button>
        </CardContent>
      </Card>

      {quoteResult && (
        <Card className="bg-card/80 backdrop-blur-sm mt-6">
          <CardHeader>
            <CardTitle className="text-base">견적 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quoteResult.available ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-sm">
                    발송 가능
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    해당 지역으로 발송이 가능합니다.
                  </span>
                </div>
                {quoteResult.estimatedCost && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">예상 운임</p>
                    <p className="text-2xl font-semibold">
                      ₩{quoteResult.estimatedCost.toLocaleString()}
                    </p>
                  </div>
                )}
                {quoteResult.estimatedDays && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">예상 배송 소요일</p>
                    <p className="text-lg font-medium">
                      약 {quoteResult.estimatedDays}일
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-sm">
                  발송 불가
                </Badge>
                <span className="text-sm text-muted-foreground">
                  해당 지역으로는 현재 발송이 불가능합니다.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <FloatHomeButton />
    </main>
  );
}
