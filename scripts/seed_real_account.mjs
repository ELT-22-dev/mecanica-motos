import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envText = fs.readFileSync(path.join(projectRoot, '.env'), 'utf8');
const env = Object.fromEntries(envText.split('\n').filter(Boolean).map(l => {
  const idx = l.indexOf('=');
  return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
}));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Set SEED_EMAIL and SEED_PASSWORD env vars before running this script.');
  console.error('Example (PowerShell): $env:SEED_EMAIL="you@example.com"; $env:SEED_PASSWORD="yourpass"; node scripts/seed_real_account.mjs');
  process.exit(1);
}

console.log('Signing in...');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authError) { console.error('signIn error:', authError); process.exit(1); }
const userId = authData.user.id;
console.log('Signed in as', authData.user.user_metadata?.display_name, '/ user id', userId);

const { data: clients, error: cErr } = await supabase.from('clients').select('*');
if (cErr) { console.error('clients query error:', cErr); process.exit(1); }
if (clients.length === 0) { console.error('No clients found on this account — nothing to link vehicles/appointments to.'); process.exit(1); }
console.log(`Using ${clients.length} existing clients (not modifying them).`);

console.log('Clearing this account\'s existing vehicles/appointments/parts/service orders/transactions (re-seed)...');
for (const t of ['service_order_items', 'service_orders', 'transactions', 'appointments', 'parts', 'vehicles']) {
  const { error } = await supabase.from(t).delete().not('id', 'is', null);
  if (error) { console.error(`clear ${t} error:`, error); process.exit(1); }
}

const MECHANICS = ['Carlos Andrade', 'Fabio Nunes', 'Rogerio Silva'];
const SERVICE_TYPES = ['Revisao', 'Troca de oleo', 'Freios', 'Suspensao', 'Corrente e relacao', 'Eletrica'];
const BRANDS_MODELS = [
  ['Honda', 'CG 160'], ['Honda', 'Biz 125'], ['Yamaha', 'Fazer 250'],
  ['Yamaha', 'Factor 150'], ['Suzuki', 'Intruder 125'], ['Kawasaki', 'Ninja 300'],
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmtDate(d) { return d.toISOString().slice(0, 10); }

// Vehicles
const vehicles = [];
for (const client of clients) {
  const vehicleCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < vehicleCount; i++) {
    const [brand, model] = pick(BRANDS_MODELS);
    vehicles.push({
      user_id: userId,
      client_id: client.id,
      client_name: client.name,
      brand, model,
      year: String(2015 + Math.floor(Math.random() * 10)),
      plate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(1000 + Math.random() * 9000)}`,
      color: pick(['Preta', 'Vermelha', 'Azul', 'Branca', 'Prata']),
      mileage: Math.floor(Math.random() * 60000),
    });
  }
}
console.log(`Inserting ${vehicles.length} vehicles...`);
const { data: insertedVehicles, error: vErr } = await supabase.from('vehicles').insert(vehicles).select();
if (vErr) { console.error('vehicles insert error:', vErr); process.exit(1); }

// Parts
const PARTS = [
  { name: 'Pastilha de freio dianteira', category: 'Freios', unit_price: 45, cost_price: 25, quantity: 12, min_quantity: 4 },
  { name: 'Oleo motor 10W30 (1L)', category: 'Lubrificantes', unit_price: 32, cost_price: 18, quantity: 30, min_quantity: 10 },
  { name: 'Corrente de transmissao', category: 'Transmissao', unit_price: 120, cost_price: 70, quantity: 5, min_quantity: 3 },
  { name: 'Vela de ignicao', category: 'Eletrica', unit_price: 22, cost_price: 12, quantity: 2, min_quantity: 5 },
  { name: 'Filtro de oleo', category: 'Lubrificantes', unit_price: 18, cost_price: 9, quantity: 1, min_quantity: 6 },
  { name: 'Amortecedor traseiro', category: 'Suspensao', unit_price: 210, cost_price: 130, quantity: 4, min_quantity: 2 },
];
const parts = PARTS.map((p) => ({ user_id: userId, sku: null, brand: null, supplier: null, location: null, ...p }));
console.log(`Inserting ${parts.length} parts...`);
const { data: insertedParts, error: pErr } = await supabase.from('parts').insert(parts).select();
if (pErr) { console.error('parts insert error:', pErr); process.exit(1); }

const today = new Date();
const appointments = [];
const serviceOrders = [];

for (let i = 14; i >= 1; i--) {
  if (Math.random() > 0.6) continue;
  const date = new Date(today);
  date.setDate(today.getDate() - i);
  const vehicle = pick(insertedVehicles);
  appointments.push({
    user_id: userId,
    client_id: vehicle.client_id,
    client_name: vehicle.client_name,
    vehicle_id: vehicle.id,
    vehicle_label: `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
    mechanic_name: pick(MECHANICS),
    date: fmtDate(date),
    time: `${String(8 + Math.floor(Math.random() * 10)).padStart(2, '0')}:${pick(['00', '30'])}`,
    service_type: pick(SERVICE_TYPES),
    status: pick(['completed', 'completed', 'completed', 'cancelled', 'no_show']),
  });
}
for (let i = 0; i <= 7; i++) {
  if (Math.random() > 0.5) continue;
  const date = new Date(today);
  date.setDate(today.getDate() + i);
  const vehicle = pick(insertedVehicles);
  appointments.push({
    user_id: userId,
    client_id: vehicle.client_id,
    client_name: vehicle.client_name,
    vehicle_id: vehicle.id,
    vehicle_label: `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
    mechanic_name: pick(MECHANICS),
    date: fmtDate(date),
    time: `${String(8 + Math.floor(Math.random() * 10)).padStart(2, '0')}:${pick(['00', '30'])}`,
    service_type: pick(SERVICE_TYPES),
    status: i === 0 ? pick(['confirmed', 'scheduled']) : pick(['scheduled', 'scheduled', 'confirmed']),
  });
}
console.log(`Inserting ${appointments.length} appointments...`);
const { error: apptError } = await supabase.from('appointments').insert(appointments);
if (apptError) { console.error('appointments insert error:', apptError); process.exit(1); }

for (let i = 0; i < 10; i++) {
  const vehicle = pick(insertedVehicles);
  const date = new Date(today);
  date.setDate(today.getDate() - Math.floor(Math.random() * 20));
  const status = pick(['open', 'in_progress', 'waiting_parts', 'completed', 'delivered']);
  const laborCost = Math.floor(Math.random() * 150 + 50);
  serviceOrders.push({
    user_id: userId,
    client_id: vehicle.client_id,
    client_name: vehicle.client_name,
    vehicle_id: vehicle.id,
    vehicle_label: `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
    mechanic_name: pick(MECHANICS),
    status,
    problem_description: pick(['Barulho no motor', 'Freio fazendo ruido', 'Revisao dos 10.000km', 'Troca de oleo e filtro', 'Nao pega na primeira']),
    labor_cost: laborCost,
    discount: 0,
    total: laborCost,
    created_at: date.toISOString(),
  });
}
console.log(`Inserting ${serviceOrders.length} service orders...`);
const { error: soError } = await supabase.from('service_orders').insert(serviceOrders);
if (soError) { console.error('service_orders insert error:', soError); process.exit(1); }

const transactions = [];
for (let i = 0; i < 12; i++) {
  const vehicle = pick(insertedVehicles);
  const date = new Date(today);
  date.setDate(today.getDate() - Math.floor(Math.random() * 30));
  transactions.push({
    user_id: userId,
    client_id: vehicle.client_id,
    client_name: vehicle.client_name,
    service_order_id: null,
    type: 'income',
    category: 'Ordem de Servico',
    description: `Servico - ${vehicle.brand} ${vehicle.model}`,
    amount: (Math.random() * 400 + 60).toFixed(2),
    payment_method: pick(['dinheiro', 'cartao', 'pix']),
    status: pick(['paid', 'paid', 'paid', 'pending']),
    paid_date: fmtDate(date),
    created_at: date.toISOString(),
  });
}
const EXPENSES = [
  { category: 'Pecas', desc: 'Compra de insumos para estoque' },
  { category: 'Aluguel', desc: 'Aluguel da oficina' },
  { category: 'Salarios', desc: 'Folha de pagamento' },
  { category: 'Equipamentos', desc: 'Manutencao de ferramentas' },
];
for (let i = 0; i < 6; i++) {
  const date = new Date(today);
  date.setDate(today.getDate() - Math.floor(Math.random() * 30));
  const exp = pick(EXPENSES);
  transactions.push({
    user_id: userId,
    client_id: null,
    client_name: null,
    service_order_id: null,
    type: 'expense',
    category: exp.category,
    description: exp.desc,
    amount: (Math.random() * 1500 + 200).toFixed(2),
    payment_method: pick(['boleto', 'cartao', 'pix']),
    status: 'paid',
    paid_date: fmtDate(date),
    created_at: date.toISOString(),
  });
}
console.log(`Inserting ${transactions.length} transactions...`);
const { error: txError } = await supabase.from('transactions').insert(transactions);
if (txError) { console.error('transactions insert error:', txError); process.exit(1); }

console.log('\n=== DONE ===');
console.log(`Seeded ${insertedVehicles.length} vehicles, ${insertedParts.length} parts, ${appointments.length} appointments, ${serviceOrders.length} service orders, ${transactions.length} transactions`);
console.log('for your existing account (', EMAIL, ') using your existing', clients.length, 'clients.');
