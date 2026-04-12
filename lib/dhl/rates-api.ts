/**
 * MyDHL API /rates, /landed-cost 호출용 공통 fetch입니다.
 */

export interface DhlJsonError {
  detail?: string;
  message?: string;
  title?: string;
  status?: number;
  [key: string]: unknown;
}

/** Basic Auth로 JSON GET 후 파싱 결과를 반환합니다 (tracking 등). */
export async function dhlGetJson<T = unknown>(
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  path: string
): Promise<{ data: T | null; error: string | null }> {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const messageRef = `mydhl-get-${Date.now()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
        "Message-Reference": messageRef,
        "Message-Reference-Date": new Date().toISOString(),
      },
    });

    const json = (await res.json().catch(() => ({}))) as T | DhlJsonError;

    if (!res.ok) {
      const err = json as DhlJsonError;
      const detail =
        err.detail || err.message || err.title || `HTTP ${res.status}`;
      return { data: null, error: String(detail) };
    }

    return { data: json as T, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { data: null, error: `DHL API 호출 오류: ${msg}` };
  }
}

/** Basic Auth로 JSON POST 후 파싱 결과를 반환합니다. */
export async function dhlPostJson<T = unknown>(
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  path: string,
  body: Record<string, unknown>
): Promise<{ data: T | null; error: string | null }> {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const messageRef = `mydhl-quote-${Date.now()}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        "Message-Reference": messageRef,
        "Message-Reference-Date": new Date().toISOString(),
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as T | DhlJsonError;

    if (!res.ok) {
      const err = json as DhlJsonError;
      const detail =
        err.detail || err.message || err.title || `HTTP ${res.status}`;
      return { data: null, error: String(detail) };
    }

    return { data: json as T, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { data: null, error: `DHL API 호출 오류: ${msg}` };
  }
}

/** KR 발송(수출)은 EXP, KR 도착(수입)은 IMP, 그 외는 EXP 기본값입니다. */
export function pickAccountNumberByRoute(
  originCountry: string,
  destinationCountry: string,
  accountExp: string,
  accountImp: string
): string {
  const o = originCountry.toUpperCase().slice(0, 2);
  const d = destinationCountry.toUpperCase().slice(0, 2);
  if (o === "KR" && d !== "KR") return accountExp;
  if (d === "KR" && o !== "KR") return accountImp;
  return accountExp;
}

/** 발송 예정일시 문자열 (Swagger nonDocInternationalShipmentRates 예시 형식) */
export function formatPlannedShippingDateTime(isoDate: string): string {
  const d = isoDate.trim();
  if (!d) return "";
  return `${d}T12:00:00GMT+09:00`;
}

/** 픽업 예정일시 (POST /pickups 예시: `2022-11-20T09:19:40 GMT+08:00`) */
export function formatPlannedPickupDateTime(
  isoDate: string,
  timeHm: string,
  tzLabel = "GMT+09:00"
): string {
  const d = isoDate.trim();
  if (!d) return "";
  const raw = (timeHm || "09:00").trim();
  const [a = "9", b = "0"] = raw.split(":");
  const hh = Math.min(23, Math.max(0, parseInt(a, 10)));
  const mm = Math.min(59, Math.max(0, parseInt(b, 10)));
  const h = String(hh).padStart(2, "0");
  const m = String(mm).padStart(2, "0");
  return `${d}T${h}:${m}:00 ${tzLabel}`;
}
