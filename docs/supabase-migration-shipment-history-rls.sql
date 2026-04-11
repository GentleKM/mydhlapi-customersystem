-- =============================================================================
-- shipment_history RLS INSERT 정책 추가
-- 운송장 생성 시 트리거가 shipment_history에 삽입할 수 있도록 INSERT 정책을 추가합니다.
-- Supabase SQL Editor에서 실행하세요.
-- =============================================================================

-- shipment_history: 본인이 소유한 shipment에 대해서만 이력 INSERT 허용
create policy "shipment_history_insert_own"
  on public.shipment_history for insert
  with check (
    exists (
      select 1 from public.shipment s
      where s.id = shipment_history.shipment_id
      and s.user_id = auth.uid()
    )
  );
