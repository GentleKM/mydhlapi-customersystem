// 클라이언트 컴포넌트에서 사용할 Supabase 클라이언트를 생성하는 유틸리티입니다.

import { createBrowserClient } from "@supabase/ssr";

/** 클라이언트 컴포넌트에서 사용할 Supabase 클라이언트를 생성합니다. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
