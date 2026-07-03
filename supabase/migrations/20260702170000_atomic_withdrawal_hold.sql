-- Money-critical: atomic wallet hold for withdrawal requests.
--
-- Previously requestWithdrawal() did a read-then-write in JS
-- (read available_balance → check → write balance-amount). That is a TOCTOU
-- race: two concurrent submits (double-click / two tabs) could both pass the
-- check and both create withdrawals, over-withdrawing real funds. The JS also
-- wrote a stale absolute value, so a client-side guard alone cannot fix it —
-- the arithmetic must happen inside the database under a row lock.
--
-- This function performs the decrement atomically and is scoped to auth.uid(),
-- so a caller can only ever move funds within their OWN wallet (also closes the
-- prior trust-the-client-userId ownership gap).

create or replace function public.request_wallet_hold(p_amount numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
  v_uid  uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero';
  end if;

  -- Atomic conditional decrement. The WHERE clause guarantees the row is only
  -- updated when it still holds enough balance; the UPDATE takes a row lock so
  -- concurrent calls serialize and the second one sees the already-reduced value.
  update public.wallets
     set available_balance = available_balance - p_amount,
         pending_balance   = pending_balance + p_amount,
         updated_at        = now()
   where id = v_uid
     and available_balance >= p_amount;

  get diagnostics v_rows = row_count;
  return v_rows > 0;   -- false = insufficient balance (no funds moved)
end;
$$;

revoke all on function public.request_wallet_hold(numeric) from public;
grant execute on function public.request_wallet_hold(numeric) to authenticated;
