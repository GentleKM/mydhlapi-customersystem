// 물품명 기반 HS 코드 AI 추천 UI를 제공하는 컴포넌트입니다.

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface HsCodeSuggestion {
  /** 추천된 HS 코드(6~10자리)입니다. */
  code: string;
  /** 추천 사유 또는 설명입니다. */
  reason: string;
}

export interface AiShipmentAssistantProps {
  /** HS 코드 추천을 수행하는 함수입니다. */
  onSuggestHsCode?: (itemName: string) => Promise<HsCodeSuggestion[]>;
  /** HS 코드 추천 중 하나가 승인되었을 때 호출되는 콜백입니다. */
  onHsCodeApproved?: (suggestion: HsCodeSuggestion) => void;
}

/** 물품명으로 HS 코드를 AI 추천받는 UI 컴포넌트입니다. */
export function AiShipmentAssistant({
  onSuggestHsCode,
  onHsCodeApproved,
}: AiShipmentAssistantProps) {
  const [itemName, setItemName] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [hsSuggestions, setHsSuggestions] = useState<HsCodeSuggestion[]>([]);

  const handleSuggestHs = async () => {
    if (!onSuggestHsCode || !itemName.trim()) return;
    try {
      setIsSuggesting(true);
      const list = await onSuggestHsCode(itemName.trim());
      setHsSuggestions(list);
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <section className="space-y-4">
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">AI HS 코드 찾기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ai-hs-item">물품명</Label>
            <div className="flex gap-2">
              <Input
                id="ai-hs-item"
                placeholder="예) 운동화, 티셔츠, 전자제품"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSuggestHs}
                disabled={isSuggesting || !onSuggestHsCode}
              >
                {isSuggesting ? "추천 중..." : "HS 코드 추천"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {hsSuggestions.length > 0 && (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">HS 코드 추천 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              아래 추천 중 하나를 선택하면 운송장 폼의 HS 코드 필드에 반영됩니다.
            </p>
            <ul className="space-y-2">
              {hsSuggestions.map((item) => (
                <li
                  key={item.code}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-background/60 p-3"
                >
                  <div className="space-y-1">
                    <Badge variant="outline" className="font-mono text-xs">
                      {item.code}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {item.reason}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onHsCodeApproved?.(item)}
                    disabled={!onHsCodeApproved}
                  >
                    이 코드 사용
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

