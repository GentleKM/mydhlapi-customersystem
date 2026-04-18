// 운송장 목록과 기본 정보를 표 형태로 보여주는 컴포넌트입니다.

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ShipmentStatus =
  | "draft"
  | "label_created"
  | "pickup_completed"
  | "delivered";

export interface ShipmentListItem {
  /** 내부 운송장 ID 또는 주문 ID입니다. */
  id: string;
  /** DHL 운송장 번호(있다면)입니다. */
  airwayBillNumber?: string;
  /** 도착지 국가 코드입니다. */
  destinationCountry: string;
  /** 현재 배송 상태입니다. */
  status: ShipmentStatus;
  /** 생성일 ISO 문자열입니다. */
  createdAt: string;
  /** 예상 배송일시(ISO, DHL tracking 반영). */
  estimatedDeliveryAt?: string | null;
  /** 연결된 픽업 번호(배차 확인번호 등)가 있으면 표시합니다. */
  pickupNumber?: string | null;
}

export interface ShipmentListProps {
  /** 테이블에 표시할 운송장 항목 목록입니다. */
  items: ShipmentListItem[];
  /** 행 클릭 시 호출되는 콜백입니다. (상세 페이지로 이동 등) */
  onRowClick?: (item: ShipmentListItem) => void;
  /** 비어 있을 때 보여줄 문구를 오버라이드할 수 있습니다. */
  emptyMessage?: string;
  /** 선택 가능 모드: 체크된 행 ID 집합과 변경 콜백입니다. */
  selection?: {
    selectedIds: Set<string>;
    onChange: (next: Set<string>) => void;
  };
}

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  draft: "작성 중",
  label_created: "운송장 생성 완료",
  pickup_completed: "픽업 완료",
  delivered: "배송 완료",
};

/** PRD의 운송장 조회 페이지에서 사용할 리스트 테이블 UI를 구현한 컴포넌트입니다. */
export function ShipmentList({
  items,
  onRowClick,
  emptyMessage = "등록된 운송장이 없습니다.",
  selection,
}: ShipmentListProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-xl border bg-card/60 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const sel = selection?.selectedIds;
  const selectableIds = items
    .filter((i) => Boolean(String(i.airwayBillNumber ?? "").trim()))
    .map((i) => i.id);
  const allSelectableChecked =
    selectableIds.length > 0 &&
    selectableIds.every((id) => sel?.has(id));

  const toggleAllSelectable = () => {
    if (!selection) return;
    if (allSelectableChecked) {
      const next = new Set(selection.selectedIds);
      for (const id of selectableIds) next.delete(id);
      selection.onChange(next);
    } else {
      const next = new Set(selection.selectedIds);
      for (const id of selectableIds) next.add(id);
      selection.onChange(next);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card/80">
      <Table>
        <TableHeader>
          <TableRow>
            {selection && (
              <TableHead className="w-10 text-center align-middle">
                <span className="sr-only">행 선택</span>
                <Checkbox
                  checked={allSelectableChecked}
                  onCheckedChange={() => toggleAllSelectable()}
                  aria-label="운송장 번호가 있는 행 전체 선택"
                />
              </TableHead>
            )}
            <TableHead className="w-[160px] text-center">
              운송장 번호
            </TableHead>
            <TableHead className="text-center">픽업 번호</TableHead>
            <TableHead className="text-center">도착지 국가</TableHead>
            <TableHead className="text-center">상태</TableHead>
            <TableHead className="text-center">예상 배송일</TableHead>
            <TableHead className="text-center">생성일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const clickable = Boolean(onRowClick);
            const hasAwb = Boolean(String(item.airwayBillNumber ?? "").trim());
            const checked = Boolean(sel?.has(item.id));

            return (
              <TableRow
                key={item.id}
                className={clickable ? "cursor-pointer" : undefined}
                onClick={
                  clickable ? () => onRowClick && onRowClick(item) : undefined
                }
              >
                {selection && (
                  <TableCell
                    className="w-10 text-center align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!hasAwb}
                      onCheckedChange={(v) => {
                        const next = new Set(selection.selectedIds);
                        if (v === true) next.add(item.id);
                        else next.delete(item.id);
                        selection.onChange(next);
                      }}
                      aria-label={`운송장 ${item.airwayBillNumber ?? item.id} 선택`}
                    />
                  </TableCell>
                )}
                <TableCell className="text-center font-mono text-xs text-foreground">
                  {item.airwayBillNumber ?? "미발급"}
                </TableCell>
                <TableCell className="text-center font-mono text-xs text-foreground">
                  {item.pickupNumber?.trim() ? item.pickupNumber : ""}
                </TableCell>
                <TableCell className="text-center text-foreground">
                  {item.destinationCountry}
                </TableCell>
                <TableCell className="text-center text-sm text-foreground">
                  {STATUS_LABEL[item.status]}
                </TableCell>
                <TableCell className="text-center text-xs text-foreground">
                  {item.estimatedDeliveryAt
                    ? new Date(item.estimatedDeliveryAt).toLocaleDateString(
                        "ko-KR"
                      )
                    : "—"}
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

