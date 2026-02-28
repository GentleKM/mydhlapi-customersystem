-- =============================================================================
-- 운송장 생성 오류 수정 및 스키마 업데이트
-- 1. item_description, item_weight 제거 (shipment_line_item로 이관 완료 시)
-- 2. shipment_line_item에 value_currency 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.
-- =============================================================================

-- 1. 기존 shipment 테이블의 레거시 컬럼 제거 (item_description NOT NULL 오류 해결)
-- shipment_line_item로 물품 정보가 이관된 경우에만 실행
alter table public.shipment drop column if exists item_description;
alter table public.shipment drop column if exists item_weight;
alter table public.shipment drop column if exists hs_code;

-- 2. shipment_line_item에 value_currency 컬럼 추가 (물품 금액 화폐 단위)
alter table public.shipment_line_item
  add column if not exists value_currency text not null default 'USD';

comment on column public.shipment_line_item.value_currency is '물품 금액 화폐 코드 (ISO 4217: USD, EUR, GBP 등)';

-- 3. 기존 데이터가 있으면 기본값 적용
update public.shipment_line_item
set value_currency = 'USD'
where value_currency is null or trim(value_currency) = '';
