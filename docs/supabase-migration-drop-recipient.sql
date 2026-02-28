-- =============================================================================
-- recipient_* 컬럼 제거 마이그레이션
-- 수취인 정보를 receiver_*로 통일하고 recipient_* 컬럼을 삭제합니다.
-- 실행 전 Supabase SQL Editor에서 해당 스크립트를 실행하세요.
-- =============================================================================

-- 1. 기존 recipient_* 데이터가 있고 receiver_*가 비어 있는 행이 있다면 마이그레이션
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shipment' and column_name = 'recipient_name'
  ) then
    update public.shipment set
      receiver_name = coalesce(nullif(trim(receiver_name), ''), recipient_name),
      receiver_country = coalesce(nullif(trim(receiver_country), ''), recipient_country),
      receiver_address1 = coalesce(nullif(trim(receiver_address1), ''), recipient_address),
      receiver_phone = coalesce(nullif(trim(receiver_phone), ''), recipient_phone)
    where (receiver_name is null or trim(receiver_name) = '')
      and recipient_name is not null
      and trim(recipient_name) != '';
  end if;
end $$;

-- 2. recipient_* 컬럼 삭제 (존재하는 컬럼만 제거)
alter table public.shipment drop column if exists recipient_name;
alter table public.shipment drop column if exists recipient_address;
alter table public.shipment drop column if exists recipient_country;
alter table public.shipment drop column if exists recipient_phone;
alter table public.shipment drop column if exists recipient_company;
alter table public.shipment drop column if exists recipient_address1;
alter table public.shipment drop column if exists recipient_address2;
alter table public.shipment drop column if exists recipient_postal_code;
alter table public.shipment drop column if exists recipient_city;
alter table public.shipment drop column if exists recipient_email;
