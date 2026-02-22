/**
 * 물품명과 수취 국가를 기반으로 HS 코드를 AI 추천하는 API Route입니다.
 * PRD: Gemini 3 Flash Preview 활용, 6~10자리 HS 코드, 수취 국가 기준 수입 코드, 추천 사유 제시
 */

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  itemName: z.string().min(1, "물품명을 입력해주세요."),
  destinationCountry: z.string().optional(),
});

const HsCodeSuggestionSchema = z.object({
  code: z
    .string()
    .regex(/^[\d.]+$/, "HS 코드는 숫자와 소수점만 포함할 수 있습니다.")
    .refine(
      (s) => {
        const digits = s.replace(/\./g, "");
        return digits.length >= 6 && digits.length <= 10;
      },
      { message: "HS 코드는 6~10자리여야 합니다." }
    )
    .describe("HS 코드 6~10자리 (예: 6404.11, 6109100010)"),
  reason: z.string().min(1).describe("추천 사유 또는 해당 품목 설명"),
});

const ResponseSchema = z.object({
  suggestions: z.array(HsCodeSuggestionSchema).min(1).max(5),
});

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI 서비스 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    const { itemName, destinationCountry } = parsed.data;

    const countryContext = destinationCountry
      ? `수취 국가는 ISO 3166-1 Alpha-2 코드 "${destinationCountry}"입니다. 해당 국가의 수입 관세 분류(HS 코드) 기준으로 추천해주세요.`
      : "수취 국가 정보가 없으면 일반적인 HS 코드 분류 기준으로 추천해주세요.";

    /** PRD: Gemini 3 Flash Preview. 사용 불가 시 gemini-2.5-flash로 대체 */
    const modelId =
      process.env.GEMINI_HS_CODE_MODEL || "gemini-3-flash-preview";
    const model = google(modelId);

    const { object } = await generateObject({
      model,
      schema: ResponseSchema,
      prompt: `당신은 국제 무역 및 관세 분류 전문가입니다.
다음 물품에 대해 가장 적합한 HS 코드(6~10자리)를 1~3개 추천해주세요.

**물품명(설명)**: ${itemName}

${countryContext}

**요구사항**:
- HS 코드는 6~10자리 숫자 형식(예: 6404.11, 6109100010)으로 작성
- 각 추천마다 해당 코드가 왜 적합한지 한글으로 추천 사유를 명확히 제시
- 수취 국가 기준으로 추천되었다면 그 사실을 사유에 포함`,
    });

    return NextResponse.json({ suggestions: object.suggestions });
  } catch (err) {
    console.error("HS 코드 추천 API 오류:", err);
    return NextResponse.json(
      {
        error:
          "일시적인 오류로 HS 코드 추천을 받지 못했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
