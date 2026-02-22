// 운송장 목록을 도착지 국가, 상태, 정렬 기준으로 필터링하는 UI 컴포넌트입니다.

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export type ShipmentFilterStatus =
  | "all"
  | "draft"
  | "label_created"
  | "pickup_completed"
  | "delivered";

export type ShipmentSortKey = "created_at_desc" | "created_at_asc";

export interface ShipmentFiltersValue {
  /** 도착지 국가 코드(예: JP, US, KR)입니다. */
  destinationCountry?: string;
  /** 운송장 상태 필터 값입니다. */
  status: ShipmentFilterStatus;
  /** 생성일 기준 정렬 방향입니다. */
  sortKey: ShipmentSortKey;
  /** 검색어(예: 수취인 이름, 운송장 번호)입니다. */
  keyword?: string;
}

export interface ShipmentFiltersProps {
  /** 현재 필터 값 상태입니다. */
  value: ShipmentFiltersValue;
  /** 사용 가능한 도착지 국가 옵션 목록입니다. */
  countryOptions: { code: string; label: string }[];
  /** 필터 값이 변경될 때 호출되는 콜백입니다. */
  onChange: (next: ShipmentFiltersValue) => void;
}

/** PRD에 정의된 운송장 필터 및 정렬 기능을 위한 검색 바 컴포넌트입니다. */
export function ShipmentFilters({
  value,
  countryOptions,
  onChange,
}: ShipmentFiltersProps) {
  const handlePartialChange = (patch: Partial<ShipmentFiltersValue>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <section
      aria-label="운송장 필터 및 정렬"
      className="flex flex-col gap-3 rounded-xl border bg-card/80 p-4 backdrop-blur-sm md:flex-row md:items-end"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="shipment-keyword">검색</Label>
        <Input
          id="shipment-keyword"
          placeholder="수취인, 운송장 번호 등으로 검색"
          value={value.keyword ?? ""}
          onChange={(event) =>
            handlePartialChange({ keyword: event.target.value || undefined })
          }
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <Label>도착지 국가</Label>
        <Select
          value={value.destinationCountry ?? "all"}
          onValueChange={(next) =>
            handlePartialChange({
              destinationCountry: next === "all" ? undefined : next,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="전체 국가" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 국가</SelectItem>
            {countryOptions.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <Label>상태</Label>
        <Select
          value={value.status}
          onValueChange={(next: ShipmentFilterStatus) =>
            handlePartialChange({ status: next })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="draft">작성 중</SelectItem>
            <SelectItem value="label_created">운송장 생성 완료</SelectItem>
            <SelectItem value="pickup_completed">픽업 완료</SelectItem>
            <SelectItem value="delivered">배송 완료</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <Label>정렬</Label>
        <Select
          value={value.sortKey}
          onValueChange={(next: ShipmentSortKey) =>
            handlePartialChange({ sortKey: next })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at_desc">최신 생성일 순</SelectItem>
            <SelectItem value="created_at_asc">오래된 생성일 순</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}

