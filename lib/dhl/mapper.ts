/**
 * DB 운송장 데이터를 MyDHL API Create Shipment 요청 JSON으로 변환하는 매퍼입니다.
 * docs/mydhl-api-2.9.0-swagger.yaml 규격을 따릅니다.
 */

import { formatPlannedPickupDateTime } from "@/lib/dhl/rates-api";

/** 운송장 생성 요청에 포함하는 픽업(POST /shipments 의 pickup 객체)입니다. */
export interface EmbeddedPickupForCreateShipment {
  readyDate: string;
  readyTime: string;
  closeTime: string;
  location: string;
  shipperContactPhone: string;
  specialInstruction?: string;
}

/** 운송장 생성 매퍼 입력(내부 DB 스냅샷과 동일 형태)입니다. */
export interface DbShipmentPayload {
  shipper_name: string;
  shipper_address1: string;
  shipper_address2?: string | null;
  shipper_postal_code: string;
  shipper_city: string;
  receiver_name: string;
  receiver_company?: string | null;
  receiver_country: string;
  receiver_address1: string;
  receiver_address2?: string | null;
  receiver_postal_code: string;
  receiver_city: string;
  receiver_email: string;
  receiver_phone: string;
  content_type: "documents" | "goods";
  gogreen_plus?: boolean | null;
  lineItems: Array<{
    description: string;
    quantity_value: number;
    quantity_unit: string;
    value: number;
    value_currency?: string;
    weight_net?: number;
    weight_gross?: number;
    hs_code?: string | null;
    manufacturer_country?: string | null;
    export_reason_type?: string;
  }>;
  package: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };
}

export interface DhlConfig {
  accountExp: string;
  accountImp: string;
}

function normalizeCloseTime(t: string): string {
  const raw = (t || "18:00").trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "18:00";
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** DB 데이터를 MyDHL API Create Shipment 요청 본문으로 변환합니다. */
export function mapToDhlCreateShipmentRequest(
  payload: DbShipmentPayload,
  config: DhlConfig,
  options?: { embeddedPickup?: EmbeddedPickupForCreateShipment }
): Record<string, unknown> {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const defaultPlanned = now.toISOString().replace(/\.\d{3}Z$/, " GMT+00:00");
  const plannedShipping = options?.embeddedPickup
    ? formatPlannedPickupDateTime(
        options.embeddedPickup.readyDate,
        options.embeddedPickup.readyTime,
        "GMT+09:00"
      )
    : defaultPlanned;

  const shipperAddress: Record<string, string> = {
    postalCode: String(payload.shipper_postal_code ?? "").slice(0, 12),
    cityName: String(payload.shipper_city ?? "").slice(0, 45),
    countryCode: "KR",
    addressLine1: String(payload.shipper_address1 ?? "").slice(0, 45),
    countryName: "KOREA, REPUBLIC OF",
  };
  if (payload.shipper_address2) {
    shipperAddress.addressLine2 = String(payload.shipper_address2).slice(0, 45);
  }

  const receiverAddress: Record<string, string> = {
    postalCode: String(payload.receiver_postal_code ?? "").slice(0, 12),
    cityName: String(payload.receiver_city ?? "").slice(0, 45),
    countryCode: String(payload.receiver_country ?? "US").slice(0, 2),
    addressLine1: String(payload.receiver_address1 ?? "").slice(0, 45),
    countryName: getCountryName(payload.receiver_country),
  };
  if (payload.receiver_address2) {
    receiverAddress.addressLine2 = String(payload.receiver_address2).slice(0, 45);
  }

  const customerDetails = {
    shipperDetails: {
      postalAddress: shipperAddress,
      contactInformation: {
        fullName: String(payload.shipper_name ?? "").slice(0, 70),
        companyName: String(payload.shipper_name ?? "").slice(0, 45),
        email: "shipper@example.com",
        phone: "01012345678",
      },
      typeCode: "business" as const,
    },
    receiverDetails: {
      postalAddress: receiverAddress,
      contactInformation: {
        fullName: String(payload.receiver_name ?? "").slice(0, 70),
        companyName: String(payload.receiver_company ?? payload.receiver_name ?? "").slice(0, 45),
        email: String(payload.receiver_email ?? "").slice(0, 80),
        phone: String(payload.receiver_phone ?? "").slice(0, 25),
      },
      typeCode: "business" as const,
    },
  };

  const pkg = payload.package;
  const packages = [
    {
      typeCode: "2BP" as const,
      weight: Math.max(0.001, Number(pkg.weight) || 1),
      dimensions: {
        length: Math.max(1, Math.round(Number(pkg.length) || 10)),
        width: Math.max(1, Math.round(Number(pkg.width) || 10)),
        height: Math.max(1, Math.round(Number(pkg.height) || 10)),
      },
      customerReferences: [{ value: payload.receiver_postal_code || "REF", typeCode: "CU" as const }],
    },
  ];

  const valueAddedServices: Array<{ serviceCode: string; value?: number; currency?: string }> = [];
  if (payload.gogreen_plus) {
    valueAddedServices.push({ serviceCode: "YY" });
  }

  const isGoods = payload.content_type === "goods" && payload.lineItems.length > 0;
  const productCode = isGoods ? "P" : "D";

  const pickupBlock: Record<string, unknown> = options?.embeddedPickup
    ? {
        isRequested: true,
        closeTime: normalizeCloseTime(options.embeddedPickup.closeTime),
        location: options.embeddedPickup.location.trim().slice(0, 80),
        ...(options.embeddedPickup.specialInstruction?.trim()
          ? {
              specialInstructions: [
                {
                  value: options.embeddedPickup.specialInstruction.trim().slice(0, 75),
                },
              ],
            }
          : {}),
        pickupDetails: {
          typeCode: "business",
          postalAddress: { ...shipperAddress },
          contactInformation: {
            phone: options.embeddedPickup.shipperContactPhone.trim().slice(0, 70),
            companyName: String(payload.shipper_name ?? "").slice(0, 100),
            fullName: String(payload.shipper_name ?? "").slice(0, 255),
          },
        },
      }
    : { isRequested: false };

  const base: Record<string, unknown> = {
    plannedShippingDateAndTime: plannedShipping,
    pickup: pickupBlock,
    productCode,
    getRateEstimates: false,
    accounts: [
      { typeCode: "shipper", number: config.accountExp },
      { typeCode: "payer", number: config.accountExp },
    ],
    valueAddedServices: valueAddedServices.length > 0 ? valueAddedServices : undefined,
    outputImageProperties: {
      printerDPI: 300,
      encodingFormat: "pdf",
      imageOptions: [
        { typeCode: "label", templateName: "ECOM26_84_001", renderDHLLogo: true, fitLabelsToA4: false },
        { typeCode: "waybillDoc", templateName: "ARCH_8X4", isRequested: true, hideAccountNumber: false, numberOfCopies: 1 },
      ],
      splitTransportAndWaybillDocLabels: true,
    },
    customerDetails,
    content: {
      packages,
      description: isGoods ? "Shipment" : "Documents",
      incoterm: "DAP",
      unitOfMeasurement: "metric" as const,
      isCustomsDeclarable: isGoods,
    },
  };

  if (isGoods) {
    const totalValue = payload.lineItems.reduce((sum, li) => sum + (Number(li.value) || 0), 0);
    const totalWeight = payload.lineItems.reduce((sum, li) => sum + (Number(li.weight_gross ?? li.weight_net) || 0), 0);
    const primaryCurrency = (payload.lineItems[0]?.value_currency || "USD").slice(0, 3);

    const lineItems = payload.lineItems.map((li, idx) => ({
      number: idx + 1,
      description: String(li.description || "Item").slice(0, 75),
      price: Number(li.value) || 0,
      quantity: { value: Number(li.quantity_value) || 1, unitOfMeasurement: (li.quantity_unit || "PCS").slice(0, 20) },
      commodityCodes: li.hs_code
        ? [
            { typeCode: "outbound" as const, value: String(li.hs_code).replace(/\D/g, "").slice(0, 20) || "84713000" },
          ]
        : [{ typeCode: "outbound" as const, value: "84713000" }],
      exportReasonType: mapExportReasonType(li.export_reason_type),
      manufacturerCountry: (li.manufacturer_country || "KR").slice(0, 2),
      weight: {
        netValue: Number(li.weight_net ?? li.weight_gross ?? 0.1) || 0.1,
        grossValue: Number(li.weight_gross ?? li.weight_net ?? 0.1) || 0.1,
      },
      isTaxesPaid: true,
    }));

    (base.content as Record<string, unknown>).isCustomsDeclarable = true;
    (base.content as Record<string, unknown>).declaredValue = Math.max(1, totalValue || 10);
    (base.content as Record<string, unknown>).declaredValueCurrency = primaryCurrency;
    (base.content as Record<string, unknown>).exportDeclaration = {
      lineItems,
      invoice: {
        number: `INV-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        totalNetWeight: totalWeight || pkg.weight,
        totalGrossWeight: pkg.weight,
      },
      exportReasonType: "permanent",
    };
  }

  return base;
}

function mapExportReasonType(t?: string): string {
  const m: Record<string, string> = {
    sample: "sample",
    repair: "repair",
    commercial: "permanent",
  };
  return m[String(t).toLowerCase()] || "permanent";
}

function getCountryName(code: string): string {
  const names: Record<string, string> = {
    US: "UNITED STATES OF AMERICA",
    JP: "JAPAN",
    CN: "CHINA, PEOPLES REPUBLIC",
    GB: "UNITED KINGDOM",
    DE: "GERMANY",
    KR: "KOREA, REPUBLIC OF",
    FR: "FRANCE",
    SG: "SINGAPORE",
    AU: "AUSTRALIA",
    CA: "CANADA",
  };
  return names[String(code).toUpperCase().slice(0, 2)] || "UNKNOWN";
}
