/**
 * MyDHL API 호출 클라이언트입니다.
 * Basic Auth, fetch 기반으로 운송장 생성 API를 호출합니다.
 */

export interface DhlCreateShipmentResponse {
  shipmentTrackingNumber?: string;
  documents?: Array<{
    typeCode: string;
    content?: string;
    encodingFormat?: string;
  }>;
  dispatchConfirmationNumber?: string;
  status?: { statusCode?: number; statusMessage?: string };
  [key: string]: unknown;
}

export interface DhlErrorResponse {
  instance?: string;
  detail?: string;
  title?: string;
  message?: string;
  status?: number;
  validationMessages?: Array<{ property?: string; message?: string }>;
}

/** MyDHL API Create Shipment 호출 및 응답을 반환합니다. */
export async function createDhlShipment(
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  body: Record<string, unknown>
): Promise<{ data: DhlCreateShipmentResponse | null; error: string | null }> {
  const url = `${baseUrl.replace(/\/$/, "")}/shipments`;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        "Message-Reference": `mydhlapi-${Date.now()}`,
        "Message-Reference-Date": new Date().toISOString(),
      },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = json as DhlErrorResponse;
      const detail = err.detail || err.message || err.title || json?.status?.toString() || "요청 처리에 실패했습니다.";
      return { data: null, error: detail };
    }

    return { data: json as DhlCreateShipmentResponse, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { data: null, error: `DHL API 호출 오류: ${msg}` };
  }
}
