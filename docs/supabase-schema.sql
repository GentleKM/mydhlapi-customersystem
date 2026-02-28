-- =============================================================================
-- MyDHL API 고객사 시스템 - Supabase 스키마
-- PRD 및 화면 구성을 반영한 테이블 및 RLS 정책
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. public.users (auth.users와 1:1 사용자 프로필)
-- - 운송장/픽업 완료 권한(approved) 관리
-- -----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'auth.users와 1:1 사용자 프로필. 승인된 사용자만 운송장/픽업 완료 가능';
comment on column public.users.approved is 'true: 운송장 생성 및 픽업 요청 완료 가능, false: 완료 버튼 비활성화';

-- auth.users 회원가입 시 public.users에 자동 생성 (트리거)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- RLS 활성화
alter table public.users enable row level security;

-- 본인 프로필만 조회
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

-- 본인 프로필만 수정 (승인 여부는 관리자만 변경하므로 별도 정책 필요 시 추가)
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 2. public.shipment (사용자별 운송장 데이터)
-- - shipment과 pickup은 상황에 따라 연결(1:1) 또는 독립
-- - 발송인/수취인/물품/포장/부가서비스 정보 포함 (MyDHL API 스펙 기준)
-- -----------------------------------------------------------------------------
create type public.shipment_status as enum (
  'draft',           -- 작성 중
  'label_created',   -- 운송장 생성 완료
  'pickup_completed',-- 픽업 완료
  'delivered'        -- 배송 완료
);

/** 서류/물품 구분 (content type) */
create type public.shipment_content_type as enum ('documents', 'goods');

/** 발송물 종류 (exportReasonType: sample, commercial_purpose_or_sale, warranty_replacement 등) */
create type public.shipment_export_reason_type as enum ('sample', 'repair', 'commercial');

create table public.shipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  -- 발송인 정보
  shipper_name text not null,
  shipper_address1 text not null,
  shipper_address2 text,
  shipper_postal_code text not null,
  shipper_city text not null,
  -- 수취인 정보
  receiver_name text not null,
  receiver_company text,
  receiver_country text not null,
  receiver_address1 text not null,
  receiver_address2 text,
  receiver_postal_code text not null,
  receiver_city text not null,
  receiver_email text not null,
  receiver_phone text not null,
  -- 물품 구분
  content_type public.shipment_content_type not null default 'goods',
  -- 부가서비스
  gogreen_plus boolean not null default false,
  -- 기타
  airway_bill_number text,
  status public.shipment_status not null default 'draft',
  pickup_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shipment is '사용자별 운송장 데이터 (MyDHL API 스펙 기반)';

create index idx_shipment_user_id on public.shipment(user_id);
create index idx_shipment_status on public.shipment(status);
create index idx_shipment_created_at on public.shipment(created_at desc);
create index idx_shipment_destination_country on public.shipment(receiver_country);

-- -----------------------------------------------------------------------------
-- 2-1. public.shipment_line_item (물품 라인 항목, 패키지 내 다중 품목)
-- - exportReasonType, description, quantity, value, weight, hs_code, 원산지, 참조사항
-- -----------------------------------------------------------------------------
create table public.shipment_line_item (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipment(id) on delete cascade,
  sort_order smallint not null default 0,
  export_reason_type public.shipment_export_reason_type not null,
  description text not null,
  quantity_value integer not null check (quantity_value >= 1 and quantity_value <= 1000000000),
  quantity_unit text not null,
  value numeric(14, 3) not null check (value >= 0),
  value_currency text not null default 'USD',
  weight_net numeric(14, 3) not null check (weight_net >= 0),
  weight_gross numeric(14, 3) not null check (weight_gross >= 0),
  hs_code text,
  manufacturer_country text,
  customer_reference text,
  created_at timestamptz not null default now()
);

comment on table public.shipment_line_item is '운송장별 물품 라인 항목 (여러 품목 포함 가능)';

create index idx_shipment_line_item_shipment_id on public.shipment_line_item(shipment_id);

-- -----------------------------------------------------------------------------
-- 2-2. public.shipment_package (포장 정보 - 패키지 1개 단위)
-- - weight, dimensions (length, width, height) - MyDHL API packages 스펙
-- -----------------------------------------------------------------------------
create table public.shipment_package (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipment(id) on delete cascade unique,
  weight numeric(14, 3) not null check (weight >= 0.001),
  length numeric(10, 3) not null check (length >= 1),
  width numeric(10, 3) not null check (width >= 1),
  height numeric(10, 3) not null check (height >= 1),
  created_at timestamptz not null default now()
);

comment on table public.shipment_package is '운송장별 포장 정보 (1개 패키지 기준)';

create index idx_shipment_package_shipment_id on public.shipment_package(shipment_id);

create trigger shipment_updated_at
  before update on public.shipment
  for each row execute function public.set_updated_at();

-- RLS: shipment_line_item, shipment_package
alter table public.shipment_line_item enable row level security;
alter table public.shipment_package enable row level security;

create policy "shipment_line_item_select_own"
  on public.shipment_line_item for select
  using (exists (select 1 from public.shipment s where s.id = shipment_line_item.shipment_id and s.user_id = auth.uid()));
create policy "shipment_line_item_insert_own"
  on public.shipment_line_item for insert
  with check (exists (select 1 from public.shipment s where s.id = shipment_line_item.shipment_id and s.user_id = auth.uid()));
create policy "shipment_line_item_update_own"
  on public.shipment_line_item for update
  using (exists (select 1 from public.shipment s where s.id = shipment_line_item.shipment_id and s.user_id = auth.uid()));
create policy "shipment_line_item_delete_own"
  on public.shipment_line_item for delete
  using (exists (select 1 from public.shipment s where s.id = shipment_line_item.shipment_id and s.user_id = auth.uid()));

create policy "shipment_package_select_own"
  on public.shipment_package for select
  using (exists (select 1 from public.shipment s where s.id = shipment_package.shipment_id and s.user_id = auth.uid()));
create policy "shipment_package_insert_own"
  on public.shipment_package for insert
  with check (exists (select 1 from public.shipment s where s.id = shipment_package.shipment_id and s.user_id = auth.uid()));
create policy "shipment_package_update_own"
  on public.shipment_package for update
  using (exists (select 1 from public.shipment s where s.id = shipment_package.shipment_id and s.user_id = auth.uid()));
create policy "shipment_package_delete_own"
  on public.shipment_package for delete
  using (exists (select 1 from public.shipment s where s.id = shipment_package.shipment_id and s.user_id = auth.uid()));

-- RLS
alter table public.shipment enable row level security;

create policy "shipment_select_own"
  on public.shipment for select
  using (auth.uid() = user_id);

create policy "shipment_insert_own"
  on public.shipment for insert
  with check (auth.uid() = user_id);

create policy "shipment_update_own"
  on public.shipment for update
  using (auth.uid() = user_id);

create policy "shipment_delete_own"
  on public.shipment for delete
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. public.pickup (사용자별 픽업 데이터)
-- - shipment과 1:1로 연결될 수 있음 (shipment_id)
-- -----------------------------------------------------------------------------
create type public.pickup_status as enum (
  'requested',   -- 요청됨
  'scheduled',   -- 일정 확정
  'completed',   -- 픽업 완료
  'cancelled'    -- 취소
);

create table public.pickup (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  shipment_id uuid references public.shipment(id) on delete set null,
  account_name text not null,
  address text not null,
  contact_number text not null,
  pickup_date date not null,
  note text,
  status public.pickup_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pickup is '사용자별 픽업 요청 데이터. shipment과 연결되거나 독립적으로 생성 가능';
comment on column public.pickup.shipment_id is '연결된 운송장 ID (운송장과 함께 픽업 요청한 경우 또는 나중에 연결)';

create index idx_pickup_user_id on public.pickup(user_id);
create index idx_pickup_shipment_id on public.pickup(shipment_id);
create index idx_pickup_pickup_date on public.pickup(pickup_date);

create trigger pickup_updated_at
  before update on public.pickup
  for each row execute function public.set_updated_at();

-- RLS
alter table public.pickup enable row level security;

create policy "pickup_select_own"
  on public.pickup for select
  using (auth.uid() = user_id);

create policy "pickup_insert_own"
  on public.pickup for insert
  with check (auth.uid() = user_id);

create policy "pickup_update_own"
  on public.pickup for update
  using (auth.uid() = user_id);

create policy "pickup_delete_own"
  on public.pickup for delete
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. shipment.pickup_id FK 추가 (pickup 테이블 생성 후)
-- - 순환 참조 방지를 위해 나중에 추가
-- -----------------------------------------------------------------------------
alter table public.shipment
  add constraint fk_shipment_pickup
  foreign key (pickup_id) references public.pickup(id) on delete set null;

-- -----------------------------------------------------------------------------
-- 5. 추가 테이블: public.shipment_history (운송장 상태 변경 이력)
-- - 운송장 조회 페이지에서 히스토리 확인용
-- -----------------------------------------------------------------------------
create table public.shipment_history (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipment(id) on delete cascade,
  status public.shipment_status not null,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.shipment_history is '운송장 상태 변경 이력';

create index idx_shipment_history_shipment_id on public.shipment_history(shipment_id);
create index idx_shipment_history_created_at on public.shipment_history(created_at desc);

-- RLS: shipment 소유자만 조회 가능
alter table public.shipment_history enable row level security;

create policy "shipment_history_select_own"
  on public.shipment_history for select
  using (
    exists (
      select 1 from public.shipment s
      where s.id = shipment_history.shipment_id
      and s.user_id = auth.uid()
    )
  );

-- shipment 상태 변경 시 히스토리 자동 기록
create or replace function public.record_shipment_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into public.shipment_history (shipment_id, status)
    values (new.id, new.status);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger shipment_status_history
  after update on public.shipment
  for each row execute function public.record_shipment_status_change();

-- 초기 생성 시에도 히스토리 기록
create or replace function public.record_shipment_created()
returns trigger as $$
begin
  insert into public.shipment_history (shipment_id, status, description)
  values (new.id, new.status, '운송장 생성');
  return new;
end;
$$ language plpgsql;

create trigger shipment_created_history
  after insert on public.shipment
  for each row execute function public.record_shipment_created();
