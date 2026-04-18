"use server";

/**
 * 운송장 CRUD Server Actions
 * Supabase와 연동하여 로그인한 사용자 본인의 운송장만 처리합니다.
 */

import { createClient } from "@/lib/supabase/server";
import type { ContentType } from "@/lib/shipment-types";
import { mapToDhlCreateShipmentRequest } from "@/lib/dhl/mapper";
import { createDhlShipment } from "@/lib/dhl/client";
import { dhlGetJson } from "@/lib/dhl/rates-api";
import {
  mapDhlTrackingToShipmentStatus,
  parseEstimatedDeliveryToIso,
  shouldAdvanceStatus,
  type DhlTrackingShipment,
} from "@/lib/dhl/tracking-map";

export type ShipmentStatus =
  | "draft"
  | "label_created"
  | "pickup_completed"
  | "delivered";

export interface ShipmentListItem {
  id: string;
  airwayBillNumber?: string;
  /** 연결된 픽업의 배차 확인번호(표시용)가 있으면 설정합니다. */
  pickupNumber?: string | null;
  destinationCountry: string;
  status: ShipmentStatus;
  createdAt: string;
  /** DHL tracking `estimatedDeliveryDate` 반영(없으면 미표시). */
  estimatedDeliveryAt?: string | null;
}

export interface ShipmentStats {
  draft: number;
  label_created: number;
  pickup_completed: number;
  delivered: number;
}

export interface CreateShipmentInput {
  shipper: {
    name: string;
    address1: string;
    address2: string;
    postalCode: string;
    cityName: string;
  };
  receiver: {
    name: string;
    company: string;
    country: string;
    address1: string;
    address2: string;
    postalCode: string;
    cityName: string;
    email: string;
    phone: string;
  };
  contentType: ContentType;
  lineItems: Array<{
    exportReasonType: string;
    description: string;
    quantityValue: number;
    quantityUnit: string;
    value: number;
    valueCurrency?: string;
    weight: number;
    hsCode?: string;
    manufacturerCountry?: string;
    customerReference?: string;
  }>;
  package: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };
  gogreenPlus: boolean;
  /** true이면 라벨 발급 성공 시 픽업 요청 페이지로 안내합니다. */
  requestPickupAfterLabel?: boolean;
}

/** dispatch_confirmation_numbers 배열에서 화면에 표시할 픽업 번호 하나를 고릅니다. */
function pickupNumberFromDispatchList(
  numbers: string[] | null | undefined
): string | null {
  const list = Array.isArray(numbers) ? numbers : [];
  const preferred = list.find((n) => n.startsWith("CBJ"));
  return preferred ?? list[0] ?? null;
}

/** 현재 로그인한 사용자의 운송장 통계를 조회합니다. */
export async function getShipmentStats(): Promise<ShipmentStats | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const { data, error } = await supabase
    .from("shipment")
    .select("status")
    .eq("user_id", user.id);

  if (error) {
    console.error("getShipmentStats error:", error);
    return null;
  }

  const stats: ShipmentStats = {
    draft: 0,
    label_created: 0,
    pickup_completed: 0,
    delivered: 0,
  };
  for (const row of data ?? []) {
    const s = row.status as keyof ShipmentStats;
    if (s in stats) stats[s]++;
  }
  return stats;
}

/** 현재 로그인한 사용자의 운송장 목록을 최신순으로 조회합니다. */
export async function getShipments(filters?: {
  status?: ShipmentStatus;
  destinationCountry?: string;
}): Promise<{ data: ShipmentListItem[] | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { data: [], error: null };
  }

  let query = supabase
    .from("shipment")
    .select(
      "id, airway_bill_number, receiver_country, status, created_at, estimated_delivery_at, pickup_id"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.destinationCountry) {
    query = query.eq("receiver_country", filters.destinationCountry);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getShipments error:", error);
    return { data: null, error: error.message };
  }

  type Row = {
    id: string;
    airway_bill_number: string | null;
    receiver_country: string;
    status: string;
    created_at: string;
    estimated_delivery_at: string | null;
    pickup_id: string | null;
  };

  const rows = (data ?? []) as Row[];
  const shipmentIds = rows.map((r) => r.id);
  const pickupIds = [
    ...new Set(rows.map((r) => r.pickup_id).filter(Boolean)),
  ] as string[];

  const pickupByShipmentId = new Map<string, { dispatch_confirmation_numbers: string[] | null }>();
  const pickupById = new Map<string, { dispatch_confirmation_numbers: string[] | null }>();

  if (shipmentIds.length > 0) {
    const { data: linkedByShipment } = await supabase
      .from("pickup")
      .select("id, shipment_id, dispatch_confirmation_numbers")
      .eq("user_id", user.id)
      .in("shipment_id", shipmentIds);

    for (const p of linkedByShipment ?? []) {
      const row = p as {
        shipment_id: string | null;
        dispatch_confirmation_numbers: string[] | null;
      };
      if (row.shipment_id) {
        pickupByShipmentId.set(row.shipment_id, {
          dispatch_confirmation_numbers: row.dispatch_confirmation_numbers,
        });
      }
    }
  }

  if (pickupIds.length > 0) {
    const { data: linkedById } = await supabase
      .from("pickup")
      .select("id, dispatch_confirmation_numbers")
      .eq("user_id", user.id)
      .in("id", pickupIds);

    for (const p of linkedById ?? []) {
      const row = p as { id: string; dispatch_confirmation_numbers: string[] | null };
      pickupById.set(row.id, {
        dispatch_confirmation_numbers: row.dispatch_confirmation_numbers,
      });
    }
  }

  const items: ShipmentListItem[] = rows.map((row) => {
    let pickupNumber: string | null = null;
    if (row.pickup_id) {
      pickupNumber = pickupNumberFromDispatchList(
        pickupById.get(row.pickup_id)?.dispatch_confirmation_numbers ?? null
      );
    }
    if (!pickupNumber) {
      pickupNumber = pickupNumberFromDispatchList(
        pickupByShipmentId.get(row.id)?.dispatch_confirmation_numbers ?? null
      );
    }

    return {
      id: row.id,
      airwayBillNumber: row.airway_bill_number ?? undefined,
      pickupNumber,
      destinationCountry: row.receiver_country,
      status: row.status as ShipmentStatus,
      createdAt: row.created_at,
      estimatedDeliveryAt: row.estimated_delivery_at ?? null,
    };
  });

  return { data: items, error: null };
}

const TRACKING_PATH =
  "/tracking?trackingView=shipment-details-only&levelOfDetail=all";

const DHL_TRACKING_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type TrackingApiResponse = { shipments?: DhlTrackingShipment[] };

/**
 * 목록에 있는 운송장 번호로 MyDHL tracking API를 호출해 상태·예상 배송일을 갱신합니다.
 * 짧은 간격으로 연속 호출되지 않도록 건별 지연을 둡니다.
 */
export async function syncShipmentTrackingFromDhl(): Promise<{
  ok: boolean;
  error: string | null;
  updated: number;
  skipped: number;
  failures: Array<{ awb: string; message: string }>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return {
      ok: false,
      error: "로그인이 필요합니다.",
      updated: 0,
      skipped: 0,
      failures: [],
    };
  }

  const baseUrl = process.env.DHL_BASE_URL;
  const clientId = process.env.DHL_CLIENT_ID;
  const clientSecret = process.env.DHL_CLIENT_SECRET;
  if (!baseUrl || !clientId || !clientSecret) {
    return {
      ok: false,
      error: "DHL API 설정이 완료되지 않았습니다.",
      updated: 0,
      skipped: 0,
      failures: [],
    };
  }

  const { data: rows, error: listError } = await supabase
    .from("shipment")
    .select("id, airway_bill_number, status")
    .eq("user_id", user.id)
    .not("airway_bill_number", "is", null);

  if (listError) {
    return {
      ok: false,
      error: listError.message,
      updated: 0,
      skipped: 0,
      failures: [],
    };
  }

  let updated = 0;
  let skipped = 0;
  const failures: Array<{ awb: string; message: string }> = [];

  const list = (rows ?? []) as Array<{
    id: string;
    airway_bill_number: string | null;
    status: string;
  }>;

  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const awb = String(row.airway_bill_number ?? "").trim();
    if (!awb) {
      skipped++;
      continue;
    }
    if (i > 0) await sleep(DHL_TRACKING_DELAY_MS);

    const path = `/shipments/${encodeURIComponent(awb)}${TRACKING_PATH}`;
    const { data, error } = await dhlGetJson<TrackingApiResponse>(
      baseUrl,
      clientId,
      clientSecret,
      path
    );

    if (error) {
      failures.push({ awb, message: error });
      continue;
    }

    const ship = data?.shipments?.[0];
    if (!ship) {
      skipped++;
      continue;
    }

    const inferred = mapDhlTrackingToShipmentStatus(ship);
    const estIso = parseEstimatedDeliveryToIso(ship.estimatedDeliveryDate);

    const current = row.status as ShipmentStatus;
    const updates: Record<string, unknown> = {};

    if (estIso) {
      updates.estimated_delivery_at = estIso;
    }

    if (
      inferred &&
      shouldAdvanceStatus(current, inferred) &&
      inferred !== current
    ) {
      updates.status = inferred;
    }

    if (Object.keys(updates).length === 0) {
      skipped++;
      continue;
    }

    const { error: upErr } = await supabase
      .from("shipment")
      .update(updates)
      .eq("id", row.id)
      .eq("user_id", user.id);

    if (upErr) {
      failures.push({ awb, message: upErr.message });
      continue;
    }
    updated++;
  }

  return {
    ok: failures.length === 0,
    error:
      failures.length > 0
        ? `${failures.length}건의 추적 갱신에 실패했습니다.`
        : null,
    updated,
    skipped,
    failures,
  };
}

/** 운송장 상세를 조회합니다 (line_items, package 포함). */
export async function getShipmentById(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { data: null, error: "로그인이 필요합니다." };

  const { data: shipment, error: shipError } = await supabase
    .from("shipment")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (shipError || !shipment) {
    return { data: null, error: shipError?.message ?? "운송장을 찾을 수 없습니다." };
  }

  const { data: lineItems } = await supabase
    .from("shipment_line_item")
    .select("*")
    .eq("shipment_id", id)
    .order("sort_order", { ascending: true });

  const { data: pkg } = await supabase
    .from("shipment_package")
    .select("*")
    .eq("shipment_id", id)
    .single();

  return {
    data: {
      ...shipment,
      lineItems: lineItems ?? [],
      package: pkg,
    },
    error: null,
  };
}

/** 운송장을 생성합니다. */
export async function createShipment(
  input: CreateShipmentInput
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { id: null, error: "로그인이 필요합니다." };
  }

  const receiverName = input.receiver.name || "";
  const { data: shipment, error: shipError } = await supabase
    .from("shipment")
    .insert({
      user_id: user.id,
      shipper_name: input.shipper.name,
      shipper_address1: input.shipper.address1,
      shipper_address2: input.shipper.address2 || null,
      shipper_postal_code: input.shipper.postalCode,
      shipper_city: input.shipper.cityName,
      receiver_name: receiverName,
      receiver_company: input.receiver.company || null,
      receiver_country: input.receiver.country,
      receiver_address1: input.receiver.address1,
      receiver_address2: input.receiver.address2 || null,
      receiver_postal_code: input.receiver.postalCode,
      receiver_city: input.receiver.cityName,
      receiver_email: input.receiver.email,
      receiver_phone: input.receiver.phone,
      content_type: input.contentType,
      gogreen_plus: input.gogreenPlus,
      request_pickup_after_label: Boolean(input.requestPickupAfterLabel),
      status: "draft",
    })
    .select("id")
    .single();

  if (shipError || !shipment) {
    return { id: null, error: shipError?.message ?? "생성 실패" };
  }

  if (input.contentType === "goods" && input.lineItems.length > 0) {
    const lineRows = input.lineItems.map((item, i) => ({
      shipment_id: shipment.id,
      sort_order: i,
      export_reason_type: item.exportReasonType,
      description: item.description,
      quantity_value: item.quantityValue,
      quantity_unit: item.quantityUnit,
      value: item.value,
      value_currency: item.valueCurrency || "USD",
      weight_net: item.weight,
      weight_gross: item.weight,
      hs_code: item.hsCode || null,
      manufacturer_country: item.manufacturerCountry || null,
      customer_reference: item.customerReference || null,
    }));
    const { error: liError } = await supabase
      .from("shipment_line_item")
      .insert(lineRows);
    if (liError) {
      await supabase.from("shipment").delete().eq("id", shipment.id);
      return { id: null, error: liError.message };
    }
  }

  const { error: pkgError } = await supabase.from("shipment_package").insert({
    shipment_id: shipment.id,
    weight: input.package.weight,
    length: input.package.length,
    width: input.package.width,
    height: input.package.height,
  });
  if (pkgError) {
    await supabase.from("shipment").delete().eq("id", shipment.id);
    return { id: null, error: pkgError.message };
  }

  return { id: shipment.id, error: null };
}

/** 운송장을 수정합니다. */
export async function updateShipment(
  id: string,
  input: CreateShipmentInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { error: "로그인이 필요합니다." };

  const { data: existing, error: fetchErr } = await supabase
    .from("shipment")
    .select("status, airway_bill_number")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (fetchErr || !existing) {
    return { error: fetchErr?.message ?? "운송장을 찾을 수 없습니다." };
  }
  const row = existing as { status: string; airway_bill_number: string | null };
  if (
    row.status !== "draft" ||
    (row.airway_bill_number != null && String(row.airway_bill_number).trim() !== "")
  ) {
    return { error: "라벨이 발급된 운송장은 수정할 수 없습니다." };
  }

  const { error: shipError } = await supabase
    .from("shipment")
    .update({
      shipper_name: input.shipper.name,
      shipper_address1: input.shipper.address1,
      shipper_address2: input.shipper.address2 || null,
      shipper_postal_code: input.shipper.postalCode,
      shipper_city: input.shipper.cityName,
      receiver_name: input.receiver.name,
      receiver_company: input.receiver.company || null,
      receiver_country: input.receiver.country,
      receiver_address1: input.receiver.address1,
      receiver_address2: input.receiver.address2 || null,
      receiver_postal_code: input.receiver.postalCode,
      receiver_city: input.receiver.cityName,
      receiver_email: input.receiver.email,
      receiver_phone: input.receiver.phone,
      content_type: input.contentType,
      gogreen_plus: input.gogreenPlus,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (shipError) return { error: shipError.message };

  await supabase.from("shipment_line_item").delete().eq("shipment_id", id);
  if (input.contentType === "goods" && input.lineItems.length > 0) {
    const lineRows = input.lineItems.map((item, i) => ({
      shipment_id: id,
      sort_order: i,
      export_reason_type: item.exportReasonType,
      description: item.description,
      quantity_value: item.quantityValue,
      quantity_unit: item.quantityUnit,
      value: item.value,
      value_currency: item.valueCurrency || "USD",
      weight_net: item.weight,
      weight_gross: item.weight,
      hs_code: item.hsCode || null,
      manufacturer_country: item.manufacturerCountry || null,
      customer_reference: item.customerReference || null,
    }));
    await supabase.from("shipment_line_item").insert(lineRows);
  }

  const { error: pkgError } = await supabase
    .from("shipment_package")
    .update({
      weight: input.package.weight,
      length: input.package.length,
      width: input.package.width,
      height: input.package.height,
    })
    .eq("shipment_id", id);

  if (pkgError) return { error: pkgError.message };

  return { error: null };
}

/** 운송장을 삭제합니다. */
export async function deleteShipment(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { error: "로그인이 필요합니다." };

  const { data: existing, error: fetchErr } = await supabase
    .from("shipment")
    .select("status, airway_bill_number")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (fetchErr || !existing) {
    return { error: fetchErr?.message ?? "운송장을 찾을 수 없습니다." };
  }
  const row = existing as { status: string; airway_bill_number: string | null };
  if (
    row.status !== "draft" ||
    (row.airway_bill_number != null && String(row.airway_bill_number).trim() !== "")
  ) {
    return { error: "라벨이 발급된 운송장은 삭제할 수 없습니다." };
  }

  const { error } = await supabase
    .from("shipment")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

/** MyDHL API로 라벨을 생성하고 DB를 업데이트합니다. PRD 6단계: 라벨 생성 버튼 클릭 시 실행. */
export async function createDhlLabel(
  shipmentId: string
): Promise<{
  awb: string | null;
  error: string | null;
  /** 운송장 생성 시 픽업 연동을 선택한 경우 라벨 성공 후 픽업 페이지로 보냅니다. */
  redirectToPickup: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { awb: null, error: "로그인이 필요합니다.", redirectToPickup: false };
  }

  const baseUrl = process.env.DHL_BASE_URL;
  const clientId = process.env.DHL_CLIENT_ID;
  const clientSecret = process.env.DHL_CLIENT_SECRET;
  const accountExp = process.env.DHL_ACCOUNT_EXP;
  const accountImp = process.env.DHL_ACCOUNT_IMP;

  if (!baseUrl || !clientId || !clientSecret || !accountExp || !accountImp) {
    return {
      awb: null,
      error: "DHL API 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.",
      redirectToPickup: false,
    };
  }

  const { data: shipmentData, error: fetchError } = await getShipmentById(shipmentId);
  if (fetchError || !shipmentData) {
    return {
      awb: null,
      error: fetchError ?? "운송장을 찾을 수 없습니다.",
      redirectToPickup: false,
    };
  }

  const s = shipmentData as Record<string, unknown>;
  const status = s.status as string;
  const redirectToPickup =
    Boolean((s as { request_pickup_after_label?: boolean }).request_pickup_after_label) === true;
  if (status !== "draft") {
    return { awb: null, error: "이미 라벨이 생성된 운송장입니다.", redirectToPickup: false };
  }

  const lineItems = ((shipmentData as { lineItems?: Array<Record<string, unknown>> }).lineItems ?? []).map((li) => ({
    description: (li.description as string) ?? "",
    quantity_value: Number(li.quantity_value) || 1,
    quantity_unit: (li.quantity_unit as string) ?? "PCS",
    value: Number(li.value) || 0,
    value_currency: (li.value_currency as string) ?? "USD",
    weight_net: Number(li.weight_net ?? li.weight_gross) || 0,
    weight_gross: Number(li.weight_gross ?? li.weight_net) || 0,
    hs_code: (li.hs_code as string) ?? null,
    manufacturer_country: (li.manufacturer_country as string) ?? null,
    export_reason_type: (li.export_reason_type as string) ?? "commercial",
  }));

  const pkg = (shipmentData as { package?: Record<string, unknown> }).package;
  if (!pkg) {
    return { awb: null, error: "포장 정보가 없습니다.", redirectToPickup: false };
  }

  const payload = {
    shipper_name: (s.shipper_name as string) ?? "",
    shipper_address1: (s.shipper_address1 as string) ?? "",
    shipper_address2: (s.shipper_address2 as string) ?? null,
    shipper_postal_code: (s.shipper_postal_code as string) ?? "",
    shipper_city: (s.shipper_city as string) ?? "",
    receiver_name: (s.receiver_name as string) ?? "",
    receiver_company: (s.receiver_company as string) ?? null,
    receiver_country: (s.receiver_country as string) ?? "",
    receiver_address1: (s.receiver_address1 as string) ?? "",
    receiver_address2: (s.receiver_address2 as string) ?? null,
    receiver_postal_code: (s.receiver_postal_code as string) ?? "",
    receiver_city: (s.receiver_city as string) ?? "",
    receiver_email: (s.receiver_email as string) ?? "",
    receiver_phone: (s.receiver_phone as string) ?? "",
    content_type: (s.content_type as "documents" | "goods") ?? "goods",
    gogreen_plus: (s.gogreen_plus as boolean) ?? false,
    lineItems,
    package: {
      weight: Number(pkg.weight) || 1,
      length: Number(pkg.length) || 10,
      width: Number(pkg.width) || 10,
      height: Number(pkg.height) || 10,
    },
  };

  const dhlBody = mapToDhlCreateShipmentRequest(payload, {
    accountExp,
    accountImp,
  });

  const { data: dhlResponse, error: dhlError } = await createDhlShipment(
    baseUrl,
    clientId,
    clientSecret,
    dhlBody
  );

  if (dhlError || !dhlResponse) {
    return {
      awb: null,
      error: dhlError ?? "DHL API 호출에 실패했습니다.",
      redirectToPickup: false,
    };
  }

  const awb = dhlResponse.shipmentTrackingNumber;
  if (!awb) {
    return {
      awb: null,
      error: "DHL 응답에서 운송장 번호를 찾을 수 없습니다.",
      redirectToPickup: false,
    };
  }

  const { error: updateError } = await supabase
    .from("shipment")
    .update({
      airway_bill_number: awb,
      status: "label_created",
      request_pickup_after_label: false,
    })
    .eq("id", shipmentId)
    .eq("user_id", user.id);

  if (updateError) {
    return {
      awb,
      error: `라벨 생성은 완료되었으나 DB 업데이트에 실패했습니다: ${updateError.message}`,
      redirectToPickup: false,
    };
  }

  return { awb, error: null, redirectToPickup };
}

/** 사용자 승인 여부를 조회합니다. */
export async function getIsApproved(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return false;

  const { data } = await supabase
    .from("users")
    .select("approved")
    .eq("id", user.id)
    .single();

  return data?.approved ?? false;
}
