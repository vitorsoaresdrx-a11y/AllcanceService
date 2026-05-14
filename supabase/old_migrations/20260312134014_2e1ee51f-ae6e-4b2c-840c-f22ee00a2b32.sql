
-- Mechanics table (admin-managed list of mechanics)
create table if not exists mechanics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean default true,
  created_at timestamptz default now()
);
alter table mechanics enable row level security;
create policy "Authenticated can read mechanics" on mechanics for select to authenticated using (true);
create policy "Authenticated can insert mechanics" on mechanics for insert to authenticated with check (true);
create policy "Authenticated can update mechanics" on mechanics for update to authenticated using (true) with check (true);
create policy "Authenticated can delete mechanics" on mechanics for delete to authenticated using (true);

-- Service orders table
create table if not exists service_orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_cpf text,
  customer_whatsapp text,
  bike_name text,
  problem text not null,
  price numeric default 0,
  status text default 'in_repair',
  mechanic_status text default 'pending',
  mechanic_name text,
  mechanic_id uuid references mechanics(id),
  frame_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);
alter table service_orders enable row level security;
create policy "Authenticated can read service_orders" on service_orders for select to authenticated using (true);
create policy "Authenticated can insert service_orders" on service_orders for insert to authenticated with check (true);
create policy "Authenticated can update service_orders" on service_orders for update to authenticated using (true) with check (true);
create policy "Authenticated can delete service_orders" on service_orders for delete to authenticated using (true);

-- Bike service history table
create table if not exists bike_service_history (
  id uuid primary key default gen_random_uuid(),
  frame_number text not null,
  bike_name text not null,
  customer_name text,
  customer_cpf text,
  customer_phone text,
  problem text not null,
  mechanic_id uuid references mechanics(id),
  mechanic_name text,
  service_order_id uuid references service_orders(id),
  status text default 'pending',
  created_at timestamptz default now(),
  completed_at timestamptz
);
alter table bike_service_history enable row level security;
create policy "Authenticated can read bike_service_history" on bike_service_history for select to authenticated using (true);
create policy "Authenticated can insert bike_service_history" on bike_service_history for insert to authenticated with check (true);
create policy "Authenticated can update bike_service_history" on bike_service_history for update to authenticated using (true) with check (true);

-- Enable realtime
alter publication supabase_realtime add table service_orders;
alter publication supabase_realtime add table bike_service_history;
