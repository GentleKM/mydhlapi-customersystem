"use server";

/**
 * POST /pickups 픽업 예약 및 Supabase `pickup` 테이블 저장 서버 액션입니다.
 */

import { createClient } from "@/lib/supabase/server";
import {
  dhlPostJson,
  formatPlannedPickupDateTime,
  pickAccountNumberByRoute,
} from "@/lib/dhl/rates-api";
import {
  pickupFormSchema,
  type PickupFormInput,
} from "@/lib/validations/pickup";
import { getIsApproved } from "@/lib/actions/shipment";

function getDhlEnv(): {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  accountExp: string;
  accountImp: string;
} | null {
  const baseUrl = process.env.DHL_BASE_URL;
  const clientId = process.env.DHL_CLIENT_ID;
  const clientSecret = process.env.DHL_CLIENT_SECRET;
  const accountExp = process.env.DHL_ACCOUNT_EXP;
  const accountImp = process.env.DHL_ACCOUNT_IMP;
  if (!baseUrl || !clientId || !clientSecret || !accountExp || !accountImp) {
    return null;
  }
  return { baseUrl, clientId, clientSecret, accountExp, accountImp };
}

/** DB에 저장된 운송장들로 POST /pickups 의 shipmentDetails 배열을 만듭니다(AWB별 1건). */
function buildPickupShipmentDetailsFromShipments(
  orderedAwbs: string[],
  byAwbToShipmentId: Map<string, string>,
  shipments: Array<{
    id: string;
    airway_bill_number: string | null;
    content_type: string;
  }>,
  packagesByShipmentId: Map<
    string,
    { weight: number; length: number; width: number; height: number }
  >,
  declaredByShipmentId: Map<string, { value: number; currency: string }>,
  accountNumber: string
): { ok: true; details: Record<string, unknown>[] } | { ok: false; error: string } {
  const shipById = new Map(shipments.map((s) => [s.id, s]));
  const details: Record<string, unknown>[] = [];
  const acc = { typeCode: "shipper", number: accountNumber };

  for (const awbToken of orderedAwbs) {
    const sid = byAwbToShipmentId.get(awbToken);
    if (!sid) {
      return { ok: false, error: `운송장 번호 매핑 오류: ${awbToken}` };
    }
    const ship = shipById.get(sid);
    const awb = String(ship?.airway_bill_number ?? "").trim();
    if (!awb) {
      return {
        ok: false,
        error: `라벨이 발급되지 않은 운송장은 픽업에 포함할 수 없습니다: ${awbToken}`,
      };
    }
    const pkg = packagesByShipmentId.get(sid);
    if (!pkg) {
      return {
        ok: false,
        error: `포장 정보가 없어 픽업 요청을 구성할 수 없습니다: ${awbToken}`,
      };
    }
    const isGoods = ship?.content_type === "goods";
    const decl = declaredByShipmentId.get(sid) ?? { value: 1, currency: "USD" };
    const productCode = isGoods ? "P" : "D";

    details.push({
      productCode,
      isCustomsDeclarable: isGoods,
      unitOfMeasurement: "metric",
      declaredValue: decl.value,
      declaredValueCurrency: decl.currency.toUpperCase().slice(0, 3),
      accounts: [acc],
      shipmentTrackingNumber: awb,
      packages: [
        {
          weight: Math.max(0.001, Number(pkg.weight) || 0.001),
          dimensions: {
            length: Math.max(1, Math.round(Number(pkg.length) || 1)),
            width: Math.max(1, Math.round(Number(pkg.width) || 1)),
            height: Math.max(1, Math.round(Number(pkg.height) || 1)),
          },
        },
      ],
    });
  }

  return { ok: true, details };
}

/** Zod 입력으로 MyDHL Pickup 요청 본문을 구성합니다. */
function buildPickupRequestBody(
  input: PickupFormInput,
  accountNumber: string,
  shipmentDetailsOverride?: Record<string, unknown>[] | null
): Record<string, unknown> {
  const oc = input.shipperCountryCode.toUpperCase().slice(0, 2);
  const dc = input.receiverCountryCode.toUpperCase().slice(0, 2);

  const shipperAddr: Record<string, unknown> = {
    postalCode: input.shipperPostalCode.trim(),
    cityName: input.shipperCityName.trim(),
    countryCode: oc,
    addressLine1: input.shipperAddressLine1.trim(),
  };
  if (input.shipperAddressLine2?.trim()) {
    shipperAddr.addressLine2 = input.shipperAddressLine2.trim();
  }

  const receiverAddr: Record<string, unknown> = {
    postalCode: input.receiverPostalCode.trim(),
    cityName: input.receiverCityName.trim(),
    countryCode: dc,
    addressLine1: input.receiverAddressLine1.trim(),
  };
  if (input.receiverAddressLine2?.trim()) {
    receiverAddr.addressLine2 = input.receiverAddressLine2.trim();
  }

  const shipperContact: Record<string, unknown> = {
    phone: input.shipperPhone.trim(),
    companyName: input.shipperCompanyName.trim(),
    fullName: input.shipperFullName.trim(),
  };
  if (input.shipperEmail?.trim()) {
    shipperContact.email = input.shipperEmail.trim();
  }

  const receiverContact: Record<string, unknown> = {
    phone: input.receiverPhone.trim(),
    companyName: input.receiverCompanyName.trim(),
    fullName: input.receiverFullName.trim(),
  };
  if (input.receiverEmail?.trim()) {
    receiverContact.email = input.receiverEmail.trim();
  }

  const specialInstructions = input.specialInstruction?.trim()
    ? [{ value: input.specialInstruction.trim().slice(0, 80) }]
    : undefined;

  const acc = { typeCode: "shipper", number: accountNumber };

  const productCode = input.shipmentKind === "goods" ? "P" : "D";
  const isCustomsDeclarable = input.shipmentKind === "goods";

  const shipmentItem: Record<string, unknown> = {
    productCode,
    isCustomsDeclarable,
    unitOfMeasurement: "metric",
    declaredValue: input.declaredValue,
    declaredValueCurrency: input.declaredValueCurrency.toUpperCase().slice(0, 3),
    accounts: [acc],
    /** PackageRR: weight·dimensions 필수, typeCode는 Swagger상 선택(샘플에 없을 수 있음) */
    packages: [
      {
        weight: input.packageWeight,
        dimensions: {
          length: input.packageLength,
          width: input.packageWidth,
          height: input.packageHeight,
        },
      },
    ],
  };

  const shipmentDetails =
    shipmentDetailsOverride && shipmentDetailsOverride.length > 0
      ? shipmentDetailsOverride
      : [shipmentItem];

  const body: Record<string, unknown> = {
    plannedPickupDateAndTime: formatPlannedPickupDateTime(
      input.pickupDate,
      input.pickupTime
    ),
    closeTime: input.closeTime,
    location: input.location.trim(),
    locationType: "business",
    accounts: [acc],
    customerDetails: {
      shipperDetails: {
        postalAddress: shipperAddr,
        contactInformation: shipperContact,
      },
      receiverDetails: {
        postalAddress: receiverAddr,
        contactInformation: receiverContact,
      },
    },
    shipmentDetails,
  };

  if (specialInstructions) {
    body.specialInstructions = specialInstructions;
  }

  return body;
}

export type SubmitPickupResult = {
  ok: boolean;
  error: string | null;
  dispatchConfirmationNumbers: string[] | null;
  pickupId: string | null;
};

export type PickupListItem = {
  id: string;
  pickupNumber: string | null;
  /** 연동된 DHL 운송장 번호(복수 시 콤마 구분). 없으면 null. */
  waybillNumbers: string | null;
  pickupDate: string;
  requestedAt: string;
  originCountry: string;
  destinationCountry: string;
  status: "pickup_requested" | "pickup_completed";
};

/** 브라우저 time 입력이 `9:00` 형태일 때 HH:MM으로 맞춥니다. */
function normalizePickupRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if (typeof o.waybillNumbers === "string") {
    o.waybillNumbers = o.waybillNumbers.trim();
  }
  for (const key of ["pickupTime", "closeTime"]) {
    const v = o[key];
    if (typeof v === "string") {
      const m = v.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (m) {
        const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
        o[key] = `${String(hh).padStart(2, "0")}:${m[2]}`;
      }
    }
  }
  return o;
}

/** 운송장 번호 문자열을 토큰 배열로 나눕니다(중복 제거, 입력 순서 유지). */
function splitWaybillTokens(raw: string): string[] {
  const parts = raw
    .split(/[,\s，]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

/** 픽업 폼을 검증한 뒤 DHL API를 호출하고 결과를 DB에 저장합니다. */
export async function submitPickupRequest(
  raw: unknown
): Promise<SubmitPickupResult> {
  const parsed = pickupFormSchema.safeParse(normalizePickupRaw(raw));
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg = Object.values(first)
      .flat()
      .filter(Boolean)[0] as string | undefined;
    return {
      ok: false,
      error: msg || "입력값을 확인해 주세요.",
      dispatchConfirmationNumbers: null,
      pickupId: null,
    };
  }

  const input = parsed.data;

  const approved = await getIsApproved();
  if (!approved) {
    return {
      ok: false,
      error: "승인된 사용자만 픽업 요청을 할 수 있습니다.",
      dispatchConfirmationNumbers: null,
      pickupId: null,
    };
  }

  const env = getDhlEnv();
  if (!env) {
    return {
      ok: false,
      error: "DHL API 설정이 완료되지 않았습니다. 환경 변수를 확인해주세요.",
      dispatchConfirmationNumbers: null,
      pickupId: null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return {
      ok: false,
      error: "로그인이 필요합니다.",
      dispatchConfirmationNumbers: null,
      pickupId: null,
    };
  }

  const waybillTokens = splitWaybillTokens(input.waybillNumbers);
  if (waybillTokens.length === 0) {
    return {
      ok: false,
      error: "유효한 운송장 번호를 입력하세요.",
      dispatchConfirmationNumbers: null,
      pickupId: null,
    };
  }

  const { data: shipmentRows, error: shipLookupError } = await supabase
    .from("shipment")
    .select("id, airway_bill_number")
    .eq("user_id", user.id)
    .in("airway_bill_number", waybillTokens);

  if (shipLookupError) {
    return {
      ok: false,
      error: `운송장 조회에 실패했습니다: ${shipLookupError.message}`,
      dispatchConfirmationNumbers: null,
      pickupId: null,
    };
  }

  const byAwb = new Map(
    (shipmentRows ?? []).map((r) => {
      const row = r as { id: string; airway_bill_number: string | null };
      return [String(row.airway_bill_number ?? "").trim(), row.id] as const;
    })
  );
  const missing = waybillTokens.filter((t) => !byAwb.has(t));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `본인 계정에서 찾을 수 없는 운송장 번호입니다: ${missing.join(", ")}`,
      dispatchConfirmationNumbers: null,
      pickupId: null,
    };
  }

  const primaryShipmentId = byAwb.get(waybillTokens[0]) ?? null;
  if (!primaryShipmentId) {
    return {
      ok: false,
      error: "운송장과 연결할 수 없습니다.",
      dispatchConfirmationNumbers: null,
      pickupId: null,
    };
  }

  const associatedAirwayBillNumbers = waybillTokens.join(", ");

  const accountNumber = pickAccountNumberByRoute(
    input.shipperCountryCode,
    input.receiverCountryCode,
    env.accountExp,
    env.accountImp
  );

  const linkedIds = [
    ...new Set((shipmentRows ?? []).map((r) => (r as { id: string }).id)),
  ];

  const { data: shipFullRows, error: shipFullErr } = await supabase
    .from("shipment")
    .select("id, airway_bill_number, content_type")
    .eq("user_id", user.id)
    .in("id", linkedIds);

  if (shipFullErr || !shipFullRows?.length) {
    return {
      ok: false,
      error: `운송장 상세를 불러오지 못했습니다: ${shipFullErr?.message ?? "데이터 없음"}`,
      dispatchConfirmationNumbers: null,
      pickupId: null,
    };
  }

  const { data: pkgRows, error: pkgErr } = await supabase
    .from("shipment_package")
    .select("shipment_id, weight, length, width, height")
    .in("shipment_id", linkedIds);

  if (pkgErr) {
    return {
      ok: false,
      error: `포장 정보를 불러오지 못했습니다: ${pkgErr.message}`,
      dispatchConfirmationNumbers: null,
      pickupId: null,
    };
  }

  const { data: lineRows } = await supabase
    .from("shipment_line_item")
    .select("shipment_id, value, value_currency")
    .in("shipment_id", linkedIds);

  const packagesByShipmentId = new Map<
    string,
    { weight: number; length: number; width: number; height: number }
  >();
  for (const p of pkgRows ?? []) {
    const r = p as {
      shipment_id: string;
      weight: number;
      length: number;
      width: number;
      height: number;
    };
    packagesByShipmentId.set(r.shipment_id, {
      weight: Number(r.weight),
      length: Number(r.length),
      width: Number(r.width),
      height: Number(r.height),
    });
  }

  const declaredByShipmentId = new Map<string, { value: number; currency: string }>();
  for (const sid of linkedIds) {
    const ship = (shipFullRows as Array<{ id: string; content_type: string }>).find(
      (s) => s.id === sid
    );
    const lines = (lineRows ?? []).filter(
      (l) => (l as { shipment_id: string }).shipment_id === sid
    ) as Array<{ value: number; value_currency: string }>;
    if (ship?.content_type === "goods" && lines.length > 0) {
      const value = Math.max(0.001, lines.reduce((s, li) => s + Number(li.value), 0));
      const currency = String(lines[0]?.value_currency || "USD").slice(0, 3);
      declaredByShipmentId.set(sid, { value, currency });
    } else {
      declaredByShipmentId.set(sid, { value: 1, currency: "USD" });
    }
  }

  const detailResult = buildPickupShipmentDetailsFromShipments(
    waybillTokens,
    byAwb,
    shipFullRows as Array<{
      id: string;
      airway_bill_number: string | null;
      content_type: string;
    }>,
    packagesByShipmentId,
    declaredByShipmentId,
    accountNumber
  );

  if (!detailResult.ok) {
    return {
      ok: false,
      error: detailResult.error,
      dispatchConfirmationNumbers: null,
      pickupId: null,
    };
  }

  const body = buildPickupRequestBody(input, accountNumber, detailResult.details);

  const { data: apiData, error: apiError } = await dhlPostJson<{
    dispatchConfirmationNumbers?: string[];
  }>(env.baseUrl, env.clientId, env.clientSecret, "/pickups", body);

  const confirmations = apiData?.dispatchConfirmationNumbers ?? null;
  const errMsg = apiError;

  const addressSummary = [
    input.shipperAddressLine1.trim(),
    input.shipperAddressLine2?.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  const insertRow = {
    user_id: user.id,
    shipment_id: primaryShipmentId,
    associated_airway_bill_numbers: associatedAirwayBillNumbers,
    account_name: input.shipperCompanyName.trim(),
    address: addressSummary,
    contact_number: input.shipperPhone.trim(),
    pickup_date: input.pickupDate,
    note: input.specialInstruction?.trim() || null,
    status: errMsg ? "requested" : "scheduled",
    request_payload: body as object,
    response_payload: (apiData ?? null) as object | null,
    dispatch_confirmation_numbers: confirmations,
    dhl_error: errMsg,
  };

  const { data: row, error: dbError } = await supabase
    .from("pickup")
    .insert(insertRow)
    .select("id")
    .single();

  if (dbError) {
    console.error("pickup insert error:", dbError);
    const extra =
      confirmations && confirmations.length > 0
        ? ` DHL 확인번호: ${confirmations.join(", ")}`
        : "";
    return {
      ok: false,
      error: `픽업 기록 저장에 실패했습니다: ${dbError.message}.${extra}`,
      dispatchConfirmationNumbers: confirmations,
      pickupId: null,
    };
  }

  const pickupId = row?.id ?? null;
  if (pickupId) {
    const linkedShipmentIds = [
      ...new Set((shipmentRows ?? []).map((r) => (r as { id: string }).id)),
    ];
    const { error: linkErr } = await supabase
      .from("shipment")
      .update({ pickup_id: pickupId })
      .in("id", linkedShipmentIds)
      .eq("user_id", user.id);
    if (linkErr) {
      console.error("shipment pickup_id 연결 오류:", linkErr);
    }
  }

  return {
    ok: !errMsg,
    error: errMsg,
    dispatchConfirmationNumbers: confirmations,
    pickupId,
  };
}

/** 로그인 사용자 기준 픽업 요청 목록을 최신순으로 조회합니다. */
export async function getPickupRequests(): Promise<{
  data: PickupListItem[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const { data, error } = await supabase
    .from("pickup")
    .select(
      "id, pickup_date, created_at, status, dispatch_confirmation_numbers, request_payload, associated_airway_bill_numbers, shipment_id"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  const rowsRaw = (data ?? []) as Array<{
    id: string;
    pickup_date: string;
    created_at: string;
    status: string;
    dispatch_confirmation_numbers: string[] | null;
    associated_airway_bill_numbers?: string | null;
    shipment_id?: string | null;
    request_payload?: {
      customerDetails?: {
        shipperDetails?: { postalAddress?: { countryCode?: string } };
        receiverDetails?: { postalAddress?: { countryCode?: string } };
      };
    } | null;
  }>;

  const linkedShipmentIds = [
    ...new Set(rowsRaw.map((r) => r.shipment_id).filter(Boolean)),
  ] as string[];

  const awbByShipmentId = new Map<string, string | null>();
  if (linkedShipmentIds.length > 0) {
    const { data: shipRows } = await supabase
      .from("shipment")
      .select("id, airway_bill_number")
      .eq("user_id", user.id)
      .in("id", linkedShipmentIds);
    for (const s of shipRows ?? []) {
      const row = s as { id: string; airway_bill_number: string | null };
      awbByShipmentId.set(row.id, row.airway_bill_number);
    }
  }

  const items: PickupListItem[] = rowsRaw.map((r) => {
    const confirmations = Array.isArray(r.dispatch_confirmation_numbers)
      ? r.dispatch_confirmation_numbers
      : [];
    const pickupNumber =
      confirmations.find((n) => n.startsWith("CBJ")) ?? confirmations[0] ?? null;
    const originCountry =
      r.request_payload?.customerDetails?.shipperDetails?.postalAddress?.countryCode?.toUpperCase() ??
      "-";
    const destinationCountry =
      r.request_payload?.customerDetails?.receiverDetails?.postalAddress?.countryCode?.toUpperCase() ??
      "-";
    const status = r.status === "completed" ? "pickup_completed" : "pickup_requested";

    const fromAssoc = r.associated_airway_bill_numbers?.trim();
    const fromShipment =
      r.shipment_id != null
        ? (awbByShipmentId.get(r.shipment_id)?.trim() ?? null)
        : null;
    const waybillNumbers = fromAssoc || fromShipment || null;

    return {
      id: r.id,
      pickupNumber,
      waybillNumbers,
      pickupDate: r.pickup_date,
      requestedAt: r.created_at,
      originCountry,
      destinationCountry,
      status,
    };
  });

  return { data: items, error: null };
}
