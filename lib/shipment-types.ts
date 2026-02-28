/**
 * 운송장 관련 공통 타입 정의 (MyDHL API 스펙 기반)
 */

/** 서류/물품 구분 */
export type ContentType = "documents" | "goods";

/** 발송물 종류 (exportReasonType) */
export type ExportReasonType = "sample" | "repair" | "commercial";

/** 수량 단위 (DHL unitOfMeasurement enum 일부) */
export const QUANTITY_UNITS = [
  "PCS", // Pieces
  "BOX", // Boxes
  "2NO", // Each
  "EA",  // Each
  "DOZ", // Dozen
  "KG",  // Kilograms
  "GM",  // Grams
  "L",   // Liters
  "M",   // Meters
  "SET", // Set
  "PRS", // Pairs
  "X",   // No Unit
] as const;
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

/** 발송인 정보 */
export interface ShipperFormData {
  name: string;
  address1: string;
  address2: string;
  postalCode: string;
  cityName: string;
}

/** 수취인 정보 */
export interface ReceiverFormData {
  name: string;
  company: string;
  country: string;
  address1: string;
  address2: string;
  postalCode: string;
  cityName: string;
  email: string;
  phone: string;
}

/** 화폐 코드 (ISO 4217) */
export const CURRENCY_CODES = ["USD", "EUR", "GBP", "JPY", "CNY", "KRW"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/** 물품 라인 항목 */
export interface LineItemFormData {
  exportReasonType: ExportReasonType;
  description: string;
  quantityValue: number;
  quantityUnit: QuantityUnit;
  value: number;
  valueCurrency: CurrencyCode;
  weight: number;
  hsCode?: string;
  manufacturerCountry?: string;
  customerReference?: string;
}

/** 포장 정보 */
export interface PackageFormData {
  weight: number;
  length: number;
  width: number;
  height: number;
}

/** 운송장 생성 폼 전체 데이터 */
export interface CreateShipmentFormData {
  shipper: ShipperFormData;
  receiver: ReceiverFormData;
  contentType: ContentType;
  lineItems: LineItemFormData[];
  package: PackageFormData;
  gogreenPlus: boolean;
}
