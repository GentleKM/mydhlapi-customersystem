-- =============================================================================
-- MyDHL API 고객사 시스템 - 스키마 v2 마이그레이션
-- 기존 shipment 테이블이 있을 경우, 새 스키마로 마이그레이션하기 위한 스크립트입니다.
-- 주의: 기존 shipment 데이터가 있다면 백업 후 실행하세요.
-- =============================================================================

-- 새 enum 타입 추가
do $$ begin
  create type public.shipment_content_type as enum ('documents', 'goods');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.shipment_export_reason_type as enum ('sample', 'repair', 'commercial');
exception when duplicate_object then null;
end $$;

-- 기존 shipment 백업 (선택)
-- create table public.shipment_backup as select * from public.shipment;

-- shipment 테이블 구조 변경 (기존 컬럼 제거, 새 컬럼 추가)
-- 단계별로 진행

-- 1. 새 컬럼 추가
alter table public.shipment add column if not exists shipper_name text;
alter table public.shipment add column if not exists shipper_address1 text;
alter table public.shipment add column if not exists shipper_address2 text;
alter table public.shipment add column if not exists shipper_postal_code text;
alter table public.shipment add column if not exists shipper_city text;
alter table public.shipment add column if not exists receiver_company text;
alter table public.shipment add column if not exists receiver_address1 text;
alter table public.shipment add column if not exists receiver_address2 text;
alter table public.shipment add column if not exists receiver_postal_code text;
alter table public.shipment add column if not exists receiver_city text;
alter table public.shipment add column if not exists receiver_email text;
alter table public.shipment add column if not exists content_type public.shipment_content_type default 'goods';
alter table public.shipment add column if not exists gogreen_plus boolean not null default false;

-- 2. 기존 데이터 마이그레이션 (recipient_* -> receiver_*, 기존 컬럼이 있을 경우에만)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='shipment' and column_name='recipient_name') then
    update public.shipment set
      receiver_name = recipient_name,
      receiver_country = recipient_country,
      receiver_address1 = recipient_address,
      receiver_phone = recipient_phone,
      receiver_email = '',
      receiver_postal_code = '',
      receiver_city = '',
      shipper_name = '',
      shipper_address1 = '',
      shipper_postal_code = '',
      shipper_city = ''
    where recipient_name is not null;
  end if;
end $$;

-- 3. shipment_line_item 테이블 생성 (이미 있으면 스킵)
create table if not exists public.shipment_line_item (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipment(id) on delete cascade,
  sort_order smallint not null default 0,
  export_reason_type public.shipment_export_reason_type not null,
  description text not null,
  quantity_value integer not null check (quantity_value >= 1),
  quantity_unit text not null,
  value numeric(14, 3) not null check (value >= 0),
  weight_net numeric(14, 3) not null check (weight_net >= 0),
  weight_gross numeric(14, 3) not null check (weight_gross >= 0),
  hs_code text,
  manufacturer_country text,
  customer_reference text,
  created_at timestamptz not null default now()
);

create index if not exists idx_shipment_line_item_shipment_id on public.shipment_line_item(shipment_id);

-- 4. shipment_package 테이블 생성
create table if not exists public.shipment_package (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipment(id) on delete cascade unique,
  weight numeric(14, 3) not null check (weight >= 0.001),
  length numeric(10, 3) not null check (length >= 1),
  width numeric(10, 3) not null check (width >= 1),
  height numeric(10, 3) not null check (height >= 1),
  created_at timestamptz not null default now()
);

create index if not exists idx_shipment_package_shipment_id on public.shipment_package(shipment_id);

-- 5. 기존 shipment에서 line_item 및 package 마이그레이션
insert into public.shipment_line_item (shipment_id, sort_order, export_reason_type, description, quantity_value, quantity_unit, value, weight_net, weight_gross)
select id, 0, 'commercial', coalesce(item_description, 'Migrated'), 1, 'PCS', 0, coalesce(item_weight, 1), coalesce(item_weight, 1)
from public.shipment s
where not exists (select 1 from public.shipment_line_item li where li.shipment_id = s.id)
and item_description is not null;

insert into public.shipment_package (shipment_id, weight, length, width, height)
select id, coalesce(item_weight, 1), 10, 10, 10
from public.shipment s
where not exists (select 1 from public.shipment_package p where p.shipment_id = s.id);

-- 6. 기존 컬럼 제거 (선택 - 데이터 검증 후 실행)
-- alter table public.shipment drop column if exists recipient_name;
-- alter table public.shipment drop column if exists recipient_address;
-- alter table public.shipment drop column if exists recipient_country;
-- alter table public.shipment drop column if exists recipient_phone;
-- alter table public.shipment drop column if exists item_description;
-- alter table public.shipment drop column if exists item_weight;
-- alter table public.shipment drop column if exists hs_code;

-- 7. NOT NULL 제약 추가 (필수 필드 채운 후)
-- alter table public.shipment alter column shipper_name set not null;
-- ... 등
