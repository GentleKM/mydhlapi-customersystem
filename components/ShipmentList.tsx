// 운송장 목록과 기본 정보를 표 형태로 보여주는 컴포넌트입니다.

import { Badge } from "@/components/ui/badge";
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
}

export interface ShipmentListProps {
  /** 테이블에 표시할 운송장 항목 목록입니다. */
  items: ShipmentListItem[];
  /** 행 클릭 시 호출되는 콜백입니다. (상세 페이지로 이동 등) */
  onRowClick?: (item: ShipmentListItem) => void;
  /** 비어 있을 때 보여줄 문구를 오버라이드할 수 있습니다. */
  emptyMessage?: string;
}

const STATUS_BADGE_LABEL: Record<ShipmentStatus, string> = {
  draft: "작성 중",
  label_created: "운송장 생성 완료",
  pickup_completed: "픽업 완료",
  delivered: "배송 완료",
};

const STATUS_BADGE_VARIANT: Record<
  ShipmentStatus,
  "secondary" | "default" | "outline" | "ghost"
> = {
  draft: "secondary",
  label_created: "default",
  pickup_completed: "outline",
  delivered: "ghost",
};

/** PRD의 운송장 조회 페이지에서 사용할 리스트 테이블 UI를 구현한 컴포넌트입니다. */
export function ShipmentList({
  items,
  onRowClick,
  emptyMessage = "등록된 운송장이 없습니다.",
}: ShipmentListProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-xl border bg-card/60 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card/80">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px]">운송장 번호</TableHead>
            <TableHead>도착지 국가</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">생성일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const clickable = Boolean(onRowClick);

            return (
              <TableRow
                key={item.id}
                className={clickable ? "cursor-pointer" : undefined}
                onClick={
                  clickable ? () => onRowClick && onRowClick(item) : undefined
                }
              >
                <TableCell className="font-mono text-xs">
                  {item.airwayBillNumber ?? "미발급"}
                </TableCell>
                <TableCell>{item.destinationCountry}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[item.status]}>
                    {STATUS_BADGE_LABEL[item.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
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

