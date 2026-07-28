-- PL-1 — explicit cost-of-sales classification on transactions.
--
-- The P&L previously inferred Cost of Sales by keyword-matching the free-text
-- description, so gross profit and margin were computed from a guess about
-- prose. This adds the field the classification should have been reading.
--
-- Additive and nullable on purpose: existing rows keep NULL and the application
-- falls back to the old keyword heuristic when reading them, so no historical
-- figure moves as a result of this migration. New rows always carry a value.

alter table public.user_transactions
  add column if not exists cost_category text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_transactions_cost_category_check'
  ) then
    alter table public.user_transactions
      add constraint user_transactions_cost_category_check
      check (cost_category is null or cost_category in ('cost_of_sales', 'operating'));
  end if;
end $$;

comment on column public.user_transactions.cost_category is
  'Expense classification for the P&L: cost_of_sales (direct) or operating (overhead). NULL on rows created before PL-1; the app infers those from the description.';
