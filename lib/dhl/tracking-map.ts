/**
 * MyDHL GET /shipments/{id}/tracking 응답을 앱의 shipment_status 및 예상 배송일로 변환합니다.
 */

/** DB `shipment_status` enum과 동일한 네 가지 값입니다. */
export type TrackedShipmentStatus =
  | "draft"
  | "label_created"
  | "pickup_completed"
  | "delivered";

/** Swagger supermodelIoLogisticsExpressTrackingResponse.shipments[] 항목 형태에 맞춥니다. */
export interface DhlTrackingShipment {
  description?: string;
  estimatedDeliveryDate?: string;
  events?: Array<{
    date?: string;
    time?: string;
    typeCode?: string;
    description?: string;
  }>;
}

const STATUS_ORDER: Record<TrackedShipmentStatus, number> = {
  draft: 0,
  label_created: 1,
  pickup_completed: 2,
  delivered: 3,
};

/** 추적으로 유추한 상태가 DB 상태보다 앞서거나 같을 때만 반영합니다 (다운그레이드 방지). */
export function shouldAdvanceStatus(
  current: TrackedShipmentStatus,
  inferred: TrackedShipmentStatus
): boolean {
  return STATUS_ORDER[inferred] >= STATUS_ORDER[current];
}

/**
 * 이벤트·상위 description으로 DHL 응답을 네 가지 내부 상태에 매핑합니다.
 * - Delivered 계열 → delivered
 * - 픽업 완료·운송 중·통관 등 → pickup_completed
 * - 라벨 발급 직후(정보만 수신 등) → label_created
 */
export function mapDhlTrackingToShipmentStatus(
  shipment: DhlTrackingShipment
): TrackedShipmentStatus | null {
  const events = [...(shipment.events ?? [])].sort((a, b) => {
    const da = `${a.date ?? ""}T${(a.time ?? "00:00:00").slice(0, 8)}`;
    const db = `${b.date ?? ""}T${(b.time ?? "00:00:00").slice(0, 8)}`;
    return db.localeCompare(da);
  });

  const latest = events[0];
  const eventDesc = (latest?.description ?? "").toLowerCase();
  const shipDesc = (shipment.description ?? "").toLowerCase();
  const type = (latest?.typeCode ?? "").toUpperCase();
  const blob = `${eventDesc} ${shipDesc}`;

  if (type === "OK" || /\bdelivered\b/.test(blob)) {
    return "delivered";
  }
  if (
    type === "PU" ||
    /\bpicked\s*up\b|\bpick-up\b|pickup\s*completed/.test(blob)
  ) {
    return "pickup_completed";
  }
  if (
    /\btransit\b|customs|clearance|departed|facility|arrived|out\s*for\s*delivery|exception|on\s*hold/.test(
      blob
    )
  ) {
    return "pickup_completed";
  }
  if (
    /information\s*received|electronically\s*notified|processed\s*at\s*origin|shipment\s*information/.test(
      blob
    )
  ) {
    return "label_created";
  }
  if (events.length === 0 && !shipDesc) {
    return null;
  }
  return "label_created";
}

/** estimatedDeliveryDate(날짜 또는 ISO)를 timestamptz에 넣을 ISO 문자열로 변환합니다. */
export function parseEstimatedDeliveryToIso(
  raw: string | undefined
): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (t.includes("T")) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(`${t}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
