/**
 * POST /pickups(MyDHL supermodelIoLogisticsExpressPickupRequest) 입력 검증입니다.
 */

import { z } from "zod";

const timeHm = z
  .string()
  .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "시간은 HH:MM 형식이어야 합니다.");

const optionalEmail = z
  .union([z.literal(""), z.string().email().max(70)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const pickupFormSchema = z.object({
  pickupDate: z.string().min(1, "픽업 일자를 선택하세요."),
  pickupTime: timeHm,
  closeTime: timeHm,
  location: z.string().min(1).max(80),
  shipperPostalCode: z.string().max(12),
  shipperCityName: z.string().min(1).max(45),
  shipperCountryCode: z.string().length(2),
  shipperAddressLine1: z.string().min(1).max(45),
  shipperAddressLine2: z.string().max(45).optional(),
  shipperPhone: z.string().min(1).max(70),
  shipperEmail: optionalEmail,
  shipperCompanyName: z.string().min(1).max(100),
  shipperFullName: z.string().min(1).max(255),
  receiverPostalCode: z.string().max(12),
  receiverCityName: z.string().min(1).max(45),
  receiverCountryCode: z.string().length(2),
  receiverAddressLine1: z.string().min(1).max(45),
  receiverAddressLine2: z.string().max(45).optional(),
  receiverPhone: z.string().min(1).max(70),
  receiverEmail: optionalEmail,
  receiverCompanyName: z.string().min(1).max(100),
  receiverFullName: z.string().min(1).max(255),
  /** 물품→P·관세 true, 문서→D·관세 false (API 요청 시 매핑) */
  shipmentKind: z.enum(["goods", "documents"]),
  declaredValue: z.coerce.number().min(0),
  declaredValueCurrency: z.string().length(3),
  packageWeight: z.coerce.number().min(0.001),
  packageLength: z.coerce.number().min(1),
  packageWidth: z.coerce.number().min(1),
  packageHeight: z.coerce.number().min(1),
  specialInstruction: z.string().max(80).optional(),
  remark: z.string().optional(),
});

export type PickupFormInput = z.infer<typeof pickupFormSchema>;
