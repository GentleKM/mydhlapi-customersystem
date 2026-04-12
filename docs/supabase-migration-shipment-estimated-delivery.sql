-- 운송장 목록: DHL GET /shipments/{tracking}/tracking 응답의 estimatedDeliveryDate 저장용
-- Supabase SQL Editor에서 실행한 뒤, 앱에서 "상태 업데이트" 시 반영됩니다.

alter table public.shipment
  add column if not exists estimated_delivery_at timestamptz;

comment on column public.shipment.estimated_delivery_at is
  'DHL tracking API estimatedDeliveryDate (예상 배송일시)';
