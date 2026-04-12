-- 픽업 요청 DHL API 요청/응답 스냅샷 컬럼 추가 (기존 DB용)
-- 적용: Supabase SQL Editor 또는 psql

alter table public.pickup
  add column if not exists request_payload jsonb,
  add column if not exists response_payload jsonb,
  add column if not exists dispatch_confirmation_numbers text[],
  add column if not exists dhl_error text;

comment on column public.pickup.request_payload is 'DHL POST /pickups 요청 본문(JSON)';
comment on column public.pickup.response_payload is 'DHL 응답 본문(JSON)';
comment on column public.pickup.dispatch_confirmation_numbers is '배차 확인 번호 목록';
comment on column public.pickup.dhl_error is 'DHL API 오류 메시지(요청 실패 시)';
