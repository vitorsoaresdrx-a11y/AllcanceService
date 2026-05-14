
-- Table: internal_calls
create table public.internal_calls (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_by uuid not null,
  created_by_name text not null,
  target_type text not null default 'all',
  target_role text,
  target_user_id uuid,
  tenant_id uuid references public.tenants(id),
  created_at timestamptz default now()
);

alter table public.internal_calls enable row level security;

create policy "Tenant read internal_calls" on public.internal_calls
  for select to authenticated
  using (tenant_id = get_user_tenant_id(auth.uid()));

create policy "Tenant insert internal_calls" on public.internal_calls
  for insert to authenticated
  with check (tenant_id = get_user_tenant_id(auth.uid()));

create policy "Tenant delete internal_calls" on public.internal_calls
  for delete to authenticated
  using (tenant_id = get_user_tenant_id(auth.uid()));

-- Trigger to auto-set tenant_id
create trigger set_tenant_id_internal_calls
  before insert on public.internal_calls
  for each row execute function public.set_tenant_id();

-- Table: internal_call_views
create table public.internal_call_views (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references public.internal_calls(id) on delete cascade not null,
  user_id uuid not null,
  tenant_id uuid references public.tenants(id),
  viewed_at timestamptz default now(),
  unique(call_id, user_id)
);

alter table public.internal_call_views enable row level security;

create policy "Tenant read internal_call_views" on public.internal_call_views
  for select to authenticated
  using (tenant_id = get_user_tenant_id(auth.uid()));

create policy "Tenant insert internal_call_views" on public.internal_call_views
  for insert to authenticated
  with check (tenant_id = get_user_tenant_id(auth.uid()));

create trigger set_tenant_id_internal_call_views
  before insert on public.internal_call_views
  for each row execute function public.set_tenant_id();

-- Enable realtime on internal_calls
alter publication supabase_realtime add table public.internal_calls;
