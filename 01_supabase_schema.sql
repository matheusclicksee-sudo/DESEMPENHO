-- PAVONI | ANÁLISE DE DESEMPENHO MKTPLACE
-- Execute este arquivo uma única vez no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_name text not null unique,
  job_title text not null,
  access_role text not null check (access_role in ('manager','employee')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.performance_evaluations (
  id uuid primary key default gen_random_uuid(),
  employee_user_id uuid not null references public.profiles(id),
  employee_name text not null,
  role text not null,
  period text not null,
  evaluation_type text not null check (evaluation_type in ('Autoavaliação','Análise da liderança')),
  evaluator_user_id uuid not null references public.profiles(id),
  evaluator_name text not null,
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  answers jsonb not null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_perf_employee
  on public.performance_evaluations(employee_user_id);

create index if not exists idx_perf_period
  on public.performance_evaluations(period);

create index if not exists idx_perf_created
  on public.performance_evaluations(created_at desc);

-- Função auxiliar segura para verificar se o usuário é gestor.
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and access_role = 'manager'
      and active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.performance_evaluations enable row level security;

drop policy if exists "profiles_select_own_or_manager" on public.profiles;
create policy "profiles_select_own_or_manager"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_manager()
);

drop policy if exists "evaluations_select" on public.performance_evaluations;
create policy "evaluations_select"
on public.performance_evaluations
for select
to authenticated
using (
  public.is_manager()
  or (
    employee_user_id = auth.uid()
    and evaluation_type = 'Autoavaliação'
  )
);

drop policy if exists "evaluations_insert" on public.performance_evaluations;
create policy "evaluations_insert"
on public.performance_evaluations
for insert
to authenticated
with check (
  public.is_manager()
  or (
    employee_user_id = auth.uid()
    and evaluator_user_id = auth.uid()
    and evaluation_type = 'Autoavaliação'
  )
);

drop policy if exists "evaluations_delete_manager" on public.performance_evaluations;
create policy "evaluations_delete_manager"
on public.performance_evaluations
for delete
to authenticated
using (public.is_manager());

drop policy if exists "evaluations_update_manager" on public.performance_evaluations;
create policy "evaluations_update_manager"
on public.performance_evaluations
for update
to authenticated
using (public.is_manager())
with check (public.is_manager());

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.performance_evaluations to authenticated;
