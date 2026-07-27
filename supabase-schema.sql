-- OdontoManage Pro — schema inicial
-- Rode isto no painel do Supabase: SQL Editor -> New query -> cole tudo -> Run

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cpf text,
  rg text,
  birth_date date,
  sex text,
  marital_status text,
  profession text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  notes text,
  emergency_contact text,
  insurance text,
  insurance_number text,
  financial_guardian text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  patient_name text not null,
  dentist_name text,
  date date not null,
  time text not null,
  type text not null default 'Consulta',
  room text,
  notes text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  patient_name text,
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

create table if not exists medical_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  patient_name text not null,
  record_type text not null default 'note',
  title text not null,
  content text,
  diagnosis text,
  treatment_plan text,
  prescriptions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Row Level Security: cada dentista só enxerga os próprios dados
alter table patients enable row level security;
alter table appointments enable row level security;
alter table transactions enable row level security;
alter table medical_records enable row level security;

create policy "patients_owner" on patients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "appointments_owner" on appointments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_owner" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "medical_records_owner" on medical_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
