-- Create the user-data tables and the append-only audit log, all with RLS.
--
-- Addresses docs/AUDIT.md:
--   SEC-2  — RLS on every user_* table (data confidentiality currently rests
--            entirely on RLS; these tables did not exist in production yet).
--   AUD-1  — an audit_logs table must exist for the trail to work at all.
--   AUD-2  — the audit trail must be server-side and append-only.
--
-- IMPORTANT — column names.
--   The client persists rows with supabase-js `upsert`/`insert`, spreading the
--   raw domain objects (see src/lib/use-user-data.ts and src/lib/audit.ts).
--   PostgREST maps each JSON key to a column of the *same identifier*, so the
--   columns here mirror those keys exactly. camelCase keys (`ocrScanned`,
--   `dueDate`, `sentDate`, `paidDate`, `createdAt`) are double-quoted so
--   Postgres preserves their case — an unquoted (folded-to-lowercase) column
--   would not match the key and every such write would fail. Do not rename a
--   column without changing the client field it mirrors.
--
--   `created_at` is the server-side insertion time and is what the read path
--   orders by (`.order('created_at', { ascending: false })`). `updated_at` is
--   supplied by the client and drives last-write-wins conflict detection; a
--   default is set so a write that omits it still succeeds.

-- ── Tables ─────────────────────────────────────────────────────────────────

create table if not exists public.user_transactions (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        text,
  description text,
  type        text check (type in ('income', 'expense')),
  amount      numeric,
  reference   text,
  updated_at  timestamptz default now(),
  created_at  timestamptz not null default now()
);

create table if not exists public.user_expenses (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  date         text,
  description  text,
  category     text,
  amount       numeric,
  "ocrScanned" boolean,
  updated_at   timestamptz default now(),
  created_at   timestamptz not null default now()
);

create table if not exists public.user_invoices (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  "number"    text,
  client      text,
  description text,
  date        text,
  "dueDate"   text,
  amount      numeric,
  vat         boolean,
  status      text check (status in ('draft', 'sent', 'paid', 'overdue')),
  "sentDate"  text,
  "paidDate"  text,
  updated_at  timestamptz default now(),
  created_at  timestamptz not null default now()
);

create table if not exists public.user_mileage (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  date        text,
  description text,
  vehicle     text check (vehicle in ('car', 'motorcycle', 'bike')),
  miles       numeric,
  "createdAt" text,
  updated_at  timestamptz default now(),
  created_at  timestamptz not null default now()
);

-- Mirrors the DDL documented in src/lib/audit.ts; snake_case keys are mapped
-- explicitly by the client (entityId -> entity_id) so no quoting is needed.
create table if not exists public.audit_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  entity    text not null,
  entity_id text not null,
  op        text not null check (op in ('create', 'update', 'delete')),
  before    jsonb,
  after     jsonb,
  ts        timestamptz not null default now(),
  actor     text
);

-- ── Indexes ────────────────────────────────────────────────────────────────
-- The read path is `where user_id = ? order by created_at desc`.
create index if not exists user_transactions_user_created_idx on public.user_transactions (user_id, created_at desc);
create index if not exists user_expenses_user_created_idx on public.user_expenses (user_id, created_at desc);
create index if not exists user_invoices_user_created_idx on public.user_invoices (user_id, created_at desc);
create index if not exists user_mileage_user_created_idx on public.user_mileage (user_id, created_at desc);
create index if not exists audit_logs_user_ts_idx on public.audit_logs (user_id, ts desc);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.user_transactions enable row level security;
alter table public.user_expenses enable row level security;
alter table public.user_invoices enable row level security;
alter table public.user_mileage enable row level security;
alter table public.audit_logs enable row level security;

-- Owner-only full access for the four data tables. USING gates
-- read/update/delete to the owner's rows; WITH CHECK blocks inserting or
-- moving a row under another user's id.
create policy "own rows" on public.user_transactions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.user_expenses for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.user_invoices for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.user_mileage for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- audit_logs is APPEND-ONLY (AUD-2): owners may insert and read their own
-- entries only. There is deliberately no UPDATE or DELETE policy, so RLS denies
-- both — the trail cannot be rewritten or erased from the client.
create policy "audit insert own" on public.audit_logs for insert to authenticated
  with check (auth.uid() = user_id);
create policy "audit read own" on public.audit_logs for select to authenticated
  using (auth.uid() = user_id);

-- ── Grants ─────────────────────────────────────────────────────────────────
-- PostgREST reaches these tables as the `authenticated` role; RLS then filters
-- rows. `anon` is intentionally not granted — unauthenticated users persist to
-- local encrypted IndexedDB only, never to the server. audit_logs grants omit
-- update/delete as a second layer behind the append-only policy set.
grant select, insert, update, delete on public.user_transactions to authenticated;
grant select, insert, update, delete on public.user_expenses to authenticated;
grant select, insert, update, delete on public.user_invoices to authenticated;
grant select, insert, update, delete on public.user_mileage to authenticated;
grant select, insert on public.audit_logs to authenticated;
