/**
 * 운송장 생성 API에 포함할 픽업(embedded pickup) 입력 검증입니다.
 */

import { z } from "zod";

const timeHm = z
  .string()
  .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "시간은 HH:MM 형식이어야 합니다.");

export const shipmentEmbeddedPickupSchema = z
  .object({
    readyDate: z.string().min(1, "픽업(발송) 예정일을 선택하세요."),
    readyTime: timeHm,
    closeTime: timeHm,
    location: z.string().min(1).max(80),
    /** pickupDetails.contactInformation.phone (필수) — 발송인 폼에 없는 값만 수집 */
    shipperContactPhone: z.string().min(1).max(70),
    shipperContactEmail: z
      .union([z.literal(""), z.string().email().max(70)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
    specialInstruction: z.string().max(75).optional(),
  })
  .superRefine((data, ctx) => {
    const d = new Date(`${data.readyDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "유효한 날짜를 선택하세요.", path: ["readyDate"] });
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) {
      ctx.addIssue({ code: "custom", message: "과거 날짜는 선택할 수 없습니다.", path: ["readyDate"] });
    }
    const max = new Date(today);
    max.setDate(max.getDate() + 10);
    if (d > max) {
      ctx.addIssue({
        code: "custom",
        message: "발송 예정일은 오늘부터 10일 이내만 선택할 수 있습니다.",
        path: ["readyDate"],
      });
    }
  });

export type ShipmentEmbeddedPickupInput = z.infer<typeof shipmentEmbeddedPickupSchema>;
