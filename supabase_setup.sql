-- Tomin simplified schema (rebuild).
-- Raw statement files are never stored server-side; only structured data lives here.
-- The phone (React Native app) is the durable source of truth for raw files.

-- Profiles (mirrors auth.users) --------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamptz default now(),
  full_name text,
  email text unique,
  rfc text,                       -- Mexican Tax ID (for SAT integration)
  monthly_income_goal numeric(14,2)
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner." on public.profiles
  for select using (auth.uid() = id);
create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Reference data -----------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  icon text,
  categorization_labels text[] default '{}'
);

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists public.merchant_labels (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants(id) on delete cascade,
  label text not null
);

-- User financial data ------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  bank text,
  alias text,
  account_type text,              -- checking | credit | debit ...
  created_at timestamptz default now()
);

create table if not exists public.statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  account_id uuid references public.accounts(id) on delete set null,
  source_type text not null,      -- bank_pdf | sat_xml
  bank text,
  period_start date,
  period_end date,
  status text not null default 'pending',   -- pending|processing|processed|failed
  file_hash text,                 -- dedupe; raw file itself is NOT stored
  uploaded_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  statement_id uuid references public.statements(id) on delete cascade,
  tx_date date not null,
  raw_description text,
  description text,
  amount numeric(14,2) not null,
  currency text not null default 'MXN',
  tx_type text not null default 'expense',   -- income | expense
  status text not null default 'completed',  -- completed | pending
  category_id uuid references public.categories(id) on delete set null,
  merchant_id uuid references public.merchants(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_transactions_user_date on public.transactions(user_id, tx_date);
create index if not exists idx_transactions_statement on public.transactions(statement_id);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  target_date date,
  created_at timestamptz default now()
);

-- RLS for user-owned tables -------------------------------------------------
alter table public.accounts enable row level security;
alter table public.statements enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;

do $$
declare t text;
begin
  foreach t in array array['accounts','statements','transactions','goals'] loop
    execute format($f$
      create policy "owner_all_%1$s" on public.%1$s
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;
