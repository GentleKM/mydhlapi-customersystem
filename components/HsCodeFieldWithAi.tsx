// HS 코드 직접 입력 및 AI 추천을 함께 제공하는 필드 컴포넌트입니다.

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { HsCodeSuggestion } from "@/components/AiShipmentAssistant";

export interface HsCodeFieldWithAiProps {
  /** 필드 레이블 */
  label?: string;
  /** 현재 HS 코드 값 */
  value: string;
  /** 값 변경 콜백 */
  onChange: (value: string) => void;
  /** AI HS 코드 추천 함수 */
  onSuggestHsCode: (itemName: string) => Promise<HsCodeSuggestion[]>;
  /** AI 추천 시 사용할 물품 설명 (발송물 정보) */
  itemDescription: string;
}

/** HS 코드를 직접 입력하거나 AI 추천으로 채울 수 있는 필드입니다. */
export function HsCodeFieldWithAi({
  label = "HS 코드 (선택)",
  value,
  onChange,
  onSuggestHsCode,
  itemDescription,
}: HsCodeFieldWithAiProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<HsCodeSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    const query = itemDescription.trim();
    if (!query) return;
    try {
      setIsLoading(true);
      setSuggestions([]);
      setError(null);
      const list = await onSuggestHsCode(query);
      setSuggestions(list);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "일시적인 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && itemDescription.trim()) {
      handleSuggest();
    } else if (!next) {
      setSuggestions([]);
      setError(null);
    }
  };

  const handleSelect = (suggestion: HsCodeSuggestion) => {
    onChange(suggestion.code);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder="6~10자리 직접 입력 또는 AI 추천"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? "추천 중..." : "AI 추천"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            {!itemDescription.trim() ? (
              <p className="text-sm text-muted-foreground">
                발송물 정보(설명)를 먼저 입력한 뒤 AI 추천을 사용해주세요.
              </p>
            ) : isLoading ? (
              <p className="text-sm text-muted-foreground">추천 중...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                추천 결과가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {suggestions.map((s) => (
                  <li
                    key={s.code}
                    className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 p-2"
                  >
                    <div className="min-w-0 space-y-1">
                      <span className="font-mono text-xs font-medium">
                        {s.code}
                      </span>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {s.reason}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleSelect(s)}
                    >
                      사용
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
