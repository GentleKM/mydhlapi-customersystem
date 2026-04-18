-- 운송장 생성 시 픽업 예약 연동 및 픽업·운송장 번호 표시용 컬럼 추가
-- Supabase SQL Editor에서 순서대로 실행하세요.

-- 1) 라벨 발급 후 픽업 요청 페이지로 안내할지 여부 (운송장 생성 폼의 "픽업 요청" 체크)
alter table public.shipment
  add column if not exists request_pickup_after_label boolean not null default false;

comment on column public.shipment.request_pickup_after_label is
  '운송장 생성 시 픽업 요청을 함께 선택한 경우 true. 라벨 발급 성공 시 픽업 요청 화면으로 안내합니다.';

-- 2) 픽업 요청 시 연동된 DHL 운송장 번호(복수 선택 시 콤마 구분 문자열)
alter table public.pickup
  add column if not exists associated_airway_bill_numbers text null;

comment on column public.pickup.associated_airway_bill_numbers is
  '픽업 요청 폼에 입력·자동 채워진 운송장 번호(복수 시 콤마 구분). 픽업 조회 화면 표시에 사용합니다.';
