-- =============================================================================
-- shipment_line_item / shipment_package RLS 정책 보완
-- "new row violates row-level security policy for table shipment_line_item" 오류 시 실행
-- Supabase SQL Editor에서 실행하세요.
-- =============================================================================

-- shipment_line_item: 본인 shipment에 연결된 행만 INSERT/SELECT/UPDATE/DELETE
drop policy if exists "shipment_line_item_select_own" on public.shipment_line_item;
drop policy if exists "shipment_line_item_insert_own" on public.shipment_line_item;
drop policy if exists "shipment_line_item_update_own" on public.shipment_line_item;
drop policy if exists "shipment_line_item_delete_own" on public.shipment_line_item;

create policy "shipment_line_item_select_own"
  on public.shipment_line_item for select
  using (
    exists (
      select 1 from public.shipment s
      where s.id = shipment_line_item.shipment_id
      and s.user_id = auth.uid()
    )
  );

create policy "shipment_line_item_insert_own"
  on public.shipment_line_item for insert
  with check (
    exists (
      select 1 from public.shipment s
      where s.id = shipment_line_item.shipment_id
      and s.user_id = auth.uid()
    )
  );

create policy "shipment_line_item_update_own"
  on public.shipment_line_item for update
  using (
    exists (
      select 1 from public.shipment s
      where s.id = shipment_line_item.shipment_id
      and s.user_id = auth.uid()
    )
  );

create policy "shipment_line_item_delete_own"
  on public.shipment_line_item for delete
  using (
    exists (
      select 1 from public.shipment s
      where s.id = shipment_line_item.shipment_id
      and s.user_id = auth.uid()
    )
  );

-- shipment_package: 동일 패턴 (운송장 생성 시 연속 INSERT 대비)
drop policy if exists "shipment_package_select_own" on public.shipment_package;
drop policy if exists "shipment_package_insert_own" on public.shipment_package;
drop policy if exists "shipment_package_update_own" on public.shipment_package;
drop policy if exists "shipment_package_delete_own" on public.shipment_package;

create policy "shipment_package_select_own"
  on public.shipment_package for select
  using (
    exists (
      select 1 from public.shipment s
      where s.id = shipment_package.shipment_id
      and s.user_id = auth.uid()
    )
  );

create policy "shipment_package_insert_own"
  on public.shipment_package for insert
  with check (
    exists (
      select 1 from public.shipment s
      where s.id = shipment_package.shipment_id
      and s.user_id = auth.uid()
    )
  );

create policy "shipment_package_update_own"
  on public.shipment_package for update
  using (
    exists (
      select 1 from public.shipment s
      where s.id = shipment_package.shipment_id
      and s.user_id = auth.uid()
    )
  );

create policy "shipment_package_delete_own"
  on public.shipment_package for delete
  using (
    exists (
      select 1 from public.shipment s
      where s.id = shipment_package.shipment_id
      and s.user_id = auth.uid()
    )
  );

alter table public.shipment_line_item enable row level security;
alter table public.shipment_package enable row level security;
