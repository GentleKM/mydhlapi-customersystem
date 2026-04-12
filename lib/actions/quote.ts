"use server";

/**
 * 견적(/rates) 및 Landed Cost(/landed-cost) 서버 액션입니다.
 */

import {
  dhlPostJson,
  formatPlannedShippingDateTime,
  pickAccountNumberByRoute,
} from "@/lib/dhl/rates-api";

export interface QuoteRatesInput {
  originPostalCode: string;
  originCityName: string;
  originCountry: string;
  destinationPostalCode: string;
  destinationCityName: string;
  destinationCountry: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  plannedDate: string;
  isCustomsDeclarable: boolean;
  declaredValue?: number;
  declaredCurrency?: string;
}

export interface QuoteLandedCostInput extends QuoteRatesInput {
  currencyCode: string;
  itemName: string;
  itemDescription: string;
  manufacturerCountry: string;
  quantity: number;
  unitPrice: number;
  unitPriceCurrencyCode: string;
  commodityCode: string;
  itemWeightKg: number;
}

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

/** POST /rates 견적을 요청합니다. */
export async function requestDhlRates(
  input: QuoteRatesInput
): Promise<{ data: unknown | null; error: string | null }> {
  const env = getDhlEnv();
  if (!env) {
    return {
      data: null,
      error: "DHL API 설정이 완료되지 않았습니다. 환경 변수를 확인해주세요.",
    };
  }

  const accountNumber = pickAccountNumberByRoute(
    input.originCountry,
    input.destinationCountry,
    env.accountExp,
    env.accountImp
  );

  const plannedShippingDateAndTime = formatPlannedShippingDateTime(
    input.plannedDate
  );

  const body: Record<string, unknown> = {
    customerDetails: {
      shipperDetails: {
        postalCode: input.originPostalCode,
        cityName: input.originCityName,
        countryCode: input.originCountry.toUpperCase().slice(0, 2),
        addressLine1: input.originCityName,
      },
      receiverDetails: {
        postalCode: input.destinationPostalCode,
        cityName: input.destinationCityName,
        countryCode: input.destinationCountry.toUpperCase().slice(0, 2),
        addressLine1: input.destinationCityName,
      },
    },
    accounts: [{ typeCode: "shipper", number: accountNumber }],
    productsAndServices: [{ productCode: "P", localProductCode: "P" }],
    plannedShippingDateAndTime,
    unitOfMeasurement: "metric",
    isCustomsDeclarable: input.isCustomsDeclarable,
    packages: [
      {
        typeCode: "3BX",
        weight: input.weightKg,
        dimensions: {
          length: input.lengthCm,
          width: input.widthCm,
          height: input.heightCm,
        },
      },
    ],
  };

  if (input.isCustomsDeclarable && input.declaredValue != null && input.declaredCurrency) {
    body.monetaryAmount = [
      {
        typeCode: "declaredValue",
        value: input.declaredValue,
        currency: input.declaredCurrency.slice(0, 3).toUpperCase(),
      },
    ];
  }

  return dhlPostJson(
    env.baseUrl,
    env.clientId,
    env.clientSecret,
    "/rates",
    body
  );
}

/** POST /landed-cost Landed Cost를 요청합니다. */
export async function requestDhlLandedCost(
  input: QuoteLandedCostInput
): Promise<{ data: unknown | null; error: string | null }> {
  const env = getDhlEnv();
  if (!env) {
    return {
      data: null,
      error: "DHL API 설정이 완료되지 않았습니다. 환경 변수를 확인해주세요.",
    };
  }

  const accountNumber = pickAccountNumberByRoute(
    input.originCountry,
    input.destinationCountry,
    env.accountExp,
    env.accountImp
  );

  const body: Record<string, unknown> = {
    customerDetails: {
      shipperDetails: {
        postalCode: input.originPostalCode,
        cityName: input.originCityName,
        countryCode: input.originCountry.toUpperCase().slice(0, 2),
        addressLine1: input.originCityName,
      },
      receiverDetails: {
        postalCode: input.destinationPostalCode,
        cityName: input.destinationCityName,
        countryCode: input.destinationCountry.toUpperCase().slice(0, 2),
        addressLine1: input.destinationCityName,
      },
    },
    accounts: [{ typeCode: "shipper", number: accountNumber }],
    productCode: "P",
    localProductCode: "P",
    unitOfMeasurement: "metric",
    currencyCode: input.currencyCode.slice(0, 3).toUpperCase(),
    isCustomsDeclarable: input.isCustomsDeclarable,
    isDTPRequested: false,
    isInsuranceRequested: false,
    getCostBreakdown: true,
    packages: [
      {
        typeCode: "3BX",
        weight: input.weightKg,
        dimensions: {
          length: input.lengthCm,
          width: input.widthCm,
          height: input.heightCm,
        },
      },
    ],
    items: [
      {
        number: 1,
        name: input.itemName,
        description: input.itemDescription,
        manufacturerCountry: input.manufacturerCountry.toUpperCase().slice(0, 2),
        quantity: input.quantity,
        quantityType: "prt",
        unitPrice: input.unitPrice,
        unitPriceCurrencyCode: input.unitPriceCurrencyCode
          .slice(0, 3)
          .toUpperCase(),
        commodityCode: input.commodityCode.replace(/\D/g, "").slice(0, 18),
        weight: input.itemWeightKg,
        weightUnitOfMeasurement: "metric",
      },
    ],
    getTariffFormula: false,
    getQuotationID: false,
    shipmentPurpose: "commercial",
    transportationMode: "air",
    merchantSelectedCarrierName: "DHL",
  };

  return dhlPostJson(
    env.baseUrl,
    env.clientId,
    env.clientSecret,
    "/landed-cost",
    body
  );
}
