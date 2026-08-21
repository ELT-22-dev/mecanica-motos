// Esquema do banco local (SQLite) — substitui as tabelas que antes viviam no Supabase.
// Sem user_id/RLS: o sistema é de uso único (uma oficina), não multi-tenant.

export const TABLES = {
  clients: {
    createSql: `
      create table if not exists clients (
        id text primary key,
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
        created_at text not null
      )
    `,
    indexes: [
      `create index if not exists clients_name_idx on clients(name)`,
    ],
    columns: [
      'name', 'cpf_cnpj', 'phone', 'whatsapp', 'email', 'address', 'city',
      'state', 'zip', 'notes', 'status', 'created_at',
    ],
  },
  vehicles: {
    createSql: `
      create table if not exists vehicles (
        id text primary key,
        client_id text references clients(id) on delete cascade,
        client_name text not null,
        brand text not null,
        model text not null,
        year text,
        plate text,
        color text,
        chassis text,
        mileage integer,
        notes text,
        created_at text not null
      )
    `,
    indexes: [
      `create index if not exists vehicles_client_id_idx on vehicles(client_id)`,
      `create index if not exists vehicles_plate_idx on vehicles(plate)`,
    ],
    columns: [
      'client_id', 'client_name', 'brand', 'model', 'year', 'plate', 'color',
      'chassis', 'mileage', 'notes', 'created_at',
    ],
  },
  appointments: {
    createSql: `
      create table if not exists appointments (
        id text primary key,
        client_id text references clients(id) on delete set null,
        client_name text not null,
        vehicle_id text references vehicles(id) on delete set null,
        vehicle_label text,
        mechanic_name text,
        date text not null,
        time text not null,
        service_type text not null default 'Revisao',
        notes text,
        status text not null default 'scheduled',
        created_at text not null
      )
    `,
    indexes: [
      `create index if not exists appointments_client_id_idx on appointments(client_id)`,
      `create index if not exists appointments_date_idx on appointments(date)`,
    ],
    columns: [
      'client_id', 'client_name', 'vehicle_id', 'vehicle_label', 'mechanic_name',
      'date', 'time', 'service_type', 'notes', 'status', 'created_at',
    ],
  },
  parts: {
    createSql: `
      create table if not exists parts (
        id text primary key,
        name text not null,
        sku text,
        category text,
        brand text,
        unit_price real not null default 0,
        cost_price real not null default 0,
        quantity integer not null default 0,
        min_quantity integer not null default 1,
        supplier text,
        location text,
        created_at text not null
      )
    `,
    indexes: [
      `create index if not exists parts_name_idx on parts(name)`,
      `create index if not exists parts_sku_idx on parts(sku)`,
    ],
    columns: [
      'name', 'sku', 'category', 'brand', 'unit_price', 'cost_price', 'quantity',
      'min_quantity', 'supplier', 'location', 'created_at',
    ],
  },
  service_orders: {
    createSql: `
      create table if not exists service_orders (
        id text primary key,
        client_id text references clients(id) on delete set null,
        client_name text not null,
        vehicle_id text references vehicles(id) on delete set null,
        vehicle_label text,
        mechanic_name text,
        status text not null default 'open',
        problem_description text,
        diagnosis text,
        notes text,
        labor_cost real not null default 0,
        discount real not null default 0,
        total real not null default 0,
        opened_at text not null,
        completed_at text,
        created_at text not null
      )
    `,
    indexes: [
      `create index if not exists service_orders_client_id_idx on service_orders(client_id)`,
      `create index if not exists service_orders_vehicle_id_idx on service_orders(vehicle_id)`,
      `create index if not exists service_orders_status_idx on service_orders(status)`,
    ],
    columns: [
      'client_id', 'client_name', 'vehicle_id', 'vehicle_label', 'mechanic_name',
      'status', 'problem_description', 'diagnosis', 'notes', 'labor_cost',
      'discount', 'total', 'opened_at', 'completed_at', 'created_at',
    ],
  },
  service_order_items: {
    createSql: `
      create table if not exists service_order_items (
        id text primary key,
        service_order_id text not null references service_orders(id) on delete cascade,
        part_id text references parts(id) on delete set null,
        item_type text not null default 'part',
        description text not null,
        quantity real not null default 1,
        unit_price real not null default 0,
        total real not null default 0,
        created_at text not null
      )
    `,
    indexes: [
      `create index if not exists service_order_items_service_order_id_idx on service_order_items(service_order_id)`,
      `create index if not exists service_order_items_part_id_idx on service_order_items(part_id)`,
    ],
    columns: [
      'service_order_id', 'part_id', 'item_type', 'description', 'quantity',
      'unit_price', 'total', 'created_at',
    ],
  },
  transactions: {
    createSql: `
      create table if not exists transactions (
        id text primary key,
        client_id text references clients(id) on delete set null,
        client_name text,
        service_order_id text references service_orders(id) on delete set null,
        type text not null,
        category text not null,
        description text,
        amount real not null default 0,
        payment_method text,
        status text not null default 'paid',
        installments integer not null default 1,
        current_installment integer not null default 1,
        due_date text,
        paid_date text,
        created_at text not null
      )
    `,
    indexes: [
      `create index if not exists transactions_client_id_idx on transactions(client_id)`,
      `create index if not exists transactions_service_order_id_idx on transactions(service_order_id)`,
    ],
    columns: [
      'client_id', 'client_name', 'service_order_id', 'type', 'category',
      'description', 'amount', 'payment_method', 'status', 'installments',
      'current_installment', 'due_date', 'paid_date', 'created_at',
    ],
  },
  workshop_settings: {
    createSql: `
      create table if not exists workshop_settings (
        id text primary key,
        workshop_name text,
        logo_data_url text,
        updated_at text not null
      )
    `,
    indexes: [],
    columns: ['workshop_name', 'logo_data_url', 'updated_at'],
  },
}

export const TABLE_NAMES = Object.keys(TABLES)
