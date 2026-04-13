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

/** Zod 입력으로 MyDHL Pickup 요청 본문을 구성합니다. */
function buildPickupRequestBody(
  input: PickupFormInput,
  accountNumber: string
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
    shipmentDetails: [shipmentItem],
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

  const accountNumber = pickAccountNumberByRoute(
    input.shipperCountryCode,
    input.receiverCountryCode,
    env.accountExp,
    env.accountImp
  );

  const body = buildPickupRequestBody(input, accountNumber);

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

  return {
    ok: !errMsg,
    error: errMsg,
    dispatchConfirmationNumbers: confirmations,
    pickupId: row?.id ?? null,
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
      "id, pickup_date, created_at, status, dispatch_confirmation_numbers, request_payload"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  const items: PickupListItem[] = (data ?? []).map((row) => {
    const r = row as {
      id: string;
      pickup_date: string;
      created_at: string;
      status: string;
      dispatch_confirmation_numbers: string[] | null;
      request_payload?: {
        customerDetails?: {
          shipperDetails?: { postalAddress?: { countryCode?: string } };
          receiverDetails?: { postalAddress?: { countryCode?: string } };
        };
      } | null;
    };
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

    return {
      id: r.id,
      pickupNumber,
      pickupDate: r.pickup_date,
      requestedAt: r.created_at,
      originCountry,
      destinationCountry,
      status,
    };
  });

  return { data: items, error: null };
}
