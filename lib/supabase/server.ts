// 서버 컴포넌트 및 서버 액션에서 사용할 Supabase 클라이언트를 생성하는 유틸리티입니다.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** 서버 컴포넌트에서 사용할 Supabase 클라이언트를 생성합니다. 쿠키를 통해 세션을 관리합니다. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 액션에서 쿠키를 설정할 수 없는 경우 무시합니다.
          }
        },
      },
    },
  );
}
