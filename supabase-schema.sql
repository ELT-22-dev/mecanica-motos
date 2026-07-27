-- MotoManage Pro — schema inicial
-- Rode isto no painel do Supabase: SQL Editor -> New query -> cole tudo -> Run

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cpf_cnpj text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  client_name text not null,
  brand text not null,
  model text not null,
  year text,
  plate text,
  color text,
  chassis text,
  mileage integer,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  client_name text not null,
  vehicle_id uuid references vehicles(id) on delete set null,
  vehicle_label text,
  mechanic_name text,
  date date not null,
  time text not null,
  service_type text not null default 'Revisao',
  notes text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table if not exists parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  brand text,
  unit_price numeric not null default 0,
  cost_price numeric not null default 0,
  quantity integer not null default 0,
  min_quantity integer not null default 1,
  supplier text,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists service_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  client_name text not null,
  vehicle_id uuid references vehicles(id) on delete set null,
  vehicle_label text,
  mechanic_name text,
  status text not null default 'open',
  problem_description text,
  diagnosis text,
  notes text,
  labor_cost numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  opened_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists service_order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_order_id uuid not null references service_orders(id) on delete cascade,
  part_id uuid references parts(id) on delete set null,
  item_type text not null default 'part',
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  client_name text,
  service_order_id uuid references service_orders(id) on delete set null,
  type text not null,
  category text not null,
  description text,
  amount numeric not null default 0,
  payment_method text,
  status text not null default 'paid',
  installments integer not null default 1,
  current_installment integer not null default 1,
  due_date date,
  paid_date date,
  created_at timestamptz not null default now()
);

-- Row Level Security: cada usuario (oficina) so enxerga os proprios dados
alter table clients enable row level security;
alter table vehicles enable row level security;
alter table appointments enable row level security;
alter table parts enable row level security;
alter table service_orders enable row level security;
alter table service_order_items enable row level security;
alter table transactions enable row level security;

create policy "clients_owner" on clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "vehicles_owner" on vehicles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "appointments_owner" on appointments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "parts_owner" on parts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "service_orders_owner" on service_orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "service_order_items_owner" on service_order_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_owner" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
