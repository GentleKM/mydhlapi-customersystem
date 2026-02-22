"use server";

/**
 * 운송장 CRUD Server Actions
 * Supabase와 연동하여 로그인한 사용자 본인의 운송장만 처리합니다.
 */

import { createClient } from "@/lib/supabase/server";
import type { ContentType } from "@/lib/shipment-types";

export type ShipmentStatus =
  | "draft"
  | "label_created"
  | "pickup_completed"
  | "delivered";

export interface ShipmentListItem {
  id: string;
  airwayBillNumber?: string;
  destinationCountry: string;
  status: ShipmentStatus;
  createdAt: string;
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
    .select("id, airway_bill_number, receiver_country, status, created_at")
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

  const items: ShipmentListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    airwayBillNumber: row.airway_bill_number ?? undefined,
    destinationCountry: row.receiver_country,
    status: row.status as ShipmentStatus,
    createdAt: row.created_at,
  }));

  return { data: items, error: null };
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

  const { data: shipment, error: shipError } = await supabase
    .from("shipment")
    .insert({
      user_id: user.id,
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

  const { error } = await supabase
    .from("shipment")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
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
