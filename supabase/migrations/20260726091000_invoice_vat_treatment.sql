-- TAX-4 — per-invoice VAT treatment.
--
-- Invoices carried a single boolean `vat`, so the only supply the app could
-- model was standard-rated 20%. Zero-rated, reduced-rate, exempt and
-- reverse-charge supplies were unrepresentable — and zero/exempt/reverse-charge
-- are not interchangeable even though all three charge no VAT, because
-- zero-rated and reverse-charge supplies are taxable turnover on a VAT return
-- and exempt supplies are not.
--
-- Additive and nullable: existing rows keep NULL and the app derives their
-- treatment from the old boolean (true -> standard, false -> none), so no
-- invoice total changes. `vat` is deliberately left in place and kept in step
-- for new rows rather than dropped, so a rollback cannot lose data.

alter table public.user_invoices
  add column if not exists "vatTreatment" text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_invoices_vat_treatment_check'
  ) then
    alter table public.user_invoices
      add constraint user_invoices_vat_treatment_check
      check (
        "vatTreatment" is null
        or "vatTreatment" in ('standard', 'reduced', 'zero', 'exempt', 'reverse_charge', 'none')
      );
  end if;
end $$;

comment on column public.user_invoices."vatTreatment" is
  'VAT treatment of the supply: standard | reduced | zero | exempt | reverse_charge | none. NULL on rows predating TAX-4; the app derives those from the legacy vat boolean.';
