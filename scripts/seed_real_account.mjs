import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const envText = fs.readFileSync('c:/Users/joedl/Downloads/dentista-premium/.env', 'utf8');
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

const { data: patients, error: pErr } = await supabase.from('patients').select('*');
if (pErr) { console.error('patients query error:', pErr); process.exit(1); }
if (patients.length === 0) { console.error('No patients found on this account — nothing to link appointments to.'); process.exit(1); }
console.log(`Using ${patients.length} existing patients (not modifying them).`);

console.log('Clearing this account\'s existing appointments/transactions/medical_records (re-seed)...');
for (const t of ['medical_records', 'transactions', 'appointments']) {
  const { error } = await supabase.from(t).delete().not('id', 'is', null);
  if (error) { console.error(`clear ${t} error:`, error); process.exit(1); }
}

const DENTISTS = ['Camila Rocha', 'Paulo Henrique Vaz', 'Renata Souza Lima'];
const APPT_TYPES = ['Consulta', 'Limpeza', 'Avaliacao', 'Restauracao', 'Extracao', 'Canal', 'Clareamento'];
const ROOMS = ['Sala 1', 'Sala 2', 'Sala 3'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmtDate(d) { return d.toISOString().slice(0, 10); }

function makeTransaction(overrides) {
  return {
    user_id: userId,
    patient_id: null,
    patient_name: null,
    type: 'income',
    category: 'Consulta',
    description: null,
    amount: '0',
    payment_method: 'dinheiro',
    status: 'paid',
    installments: '1',
    current_installment: '1',
    due_date: null,
    paid_date: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const today = new Date();
const appointments = [];
const transactions = [];

for (let i = 21; i >= 1; i--) {
  if (Math.random() > 0.55) continue;
  const date = new Date(today);
  date.setDate(today.getDate() - i);
  const patient = pick(patients);
  const type = pick(APPT_TYPES);
  const status = pick(['completed', 'completed', 'completed', 'cancelled', 'no_show']);
  const hour = 8 + Math.floor(Math.random() * 10);
  const minute = pick(['00', '30']);
  appointments.push({
    user_id: userId,
    patient_id: patient.id,
    patient_name: patient.name,
    dentist_name: pick(DENTISTS),
    date: fmtDate(date),
    time: `${String(hour).padStart(2, '0')}:${minute}`,
    type,
    room: pick(ROOMS),
    status,
  });

  if (status === 'completed') {
    const amount = (Math.random() * 600 + 120).toFixed(2);
    transactions.push(makeTransaction({
      patient_id: patient.id,
      patient_name: patient.name,
      category: type,
      description: `${type} - ${patient.name}`,
      amount,
      payment_method: pick(['dinheiro', 'cartao', 'pix', 'boleto']),
      status: pick(['paid', 'paid', 'paid', 'pending']),
      paid_date: fmtDate(date),
      created_at: date.toISOString(),
    }));
  }
}

for (let i = 0; i <= 14; i++) {
  if (Math.random() > 0.5) continue;
  const date = new Date(today);
  date.setDate(today.getDate() + i);
  const patient = pick(patients);
  const type = pick(APPT_TYPES);
  const hour = 8 + Math.floor(Math.random() * 10);
  const minute = pick(['00', '30']);
  appointments.push({
    user_id: userId,
    patient_id: patient.id,
    patient_name: patient.name,
    dentist_name: pick(DENTISTS),
    date: fmtDate(date),
    time: `${String(hour).padStart(2, '0')}:${minute}`,
    type,
    room: pick(ROOMS),
    status: i === 0 ? pick(['confirmed', 'scheduled']) : pick(['scheduled', 'scheduled', 'confirmed']),
  });
}

for (let i = 0; i < 6; i++) {
  const patient = pick(patients);
  const dueDate = new Date(today);
  dueDate.setDate(today.getDate() + Math.floor(Math.random() * 30) - 10);
  transactions.push(makeTransaction({
    patient_id: patient.id,
    patient_name: patient.name,
    category: pick(['Ortodontia', 'Implante', 'Protese']),
    description: `Parcela - ${patient.name}`,
    amount: (Math.random() * 900 + 200).toFixed(2),
    payment_method: pick(['cartao', 'boleto', 'pix']),
    status: 'pending',
    installments: '3',
    current_installment: String(1 + Math.floor(Math.random() * 3)),
    due_date: fmtDate(dueDate),
  }));
}

const EXPENSES = [
  { category: 'Material odontologico', desc: 'Compra de insumos' },
  { category: 'Aluguel', desc: 'Aluguel da clinica' },
  { category: 'Salarios', desc: 'Folha de pagamento' },
  { category: 'Equipamentos', desc: 'Manutencao de equipamento' },
  { category: 'Marketing', desc: 'Anuncios redes sociais' },
];
for (let i = 0; i < 8; i++) {
  const date = new Date(today);
  date.setDate(today.getDate() - Math.floor(Math.random() * 30));
  const exp = pick(EXPENSES);
  transactions.push(makeTransaction({
    type: 'expense',
    category: exp.category,
    description: exp.desc,
    amount: (Math.random() * 2000 + 200).toFixed(2),
    payment_method: pick(['boleto', 'cartao', 'pix']),
    status: 'paid',
    paid_date: fmtDate(date),
    created_at: date.toISOString(),
  }));
}

console.log(`Inserting ${appointments.length} appointments...`);
const { error: apptError } = await supabase.from('appointments').insert(appointments);
if (apptError) { console.error('appointments insert error:', apptError); process.exit(1); }

console.log(`Inserting ${transactions.length} transactions...`);
const { error: txError } = await supabase.from('transactions').insert(transactions);
if (txError) { console.error('transactions insert error:', txError); process.exit(1); }

const records = [];
for (let i = 0; i < 5; i++) {
  const patient = pick(patients);
  records.push({
    user_id: userId,
    patient_id: patient.id,
    patient_name: patient.name,
    record_type: pick(['note', 'exam', 'prescription']),
    title: pick(['Avaliacao inicial', 'Raio-X panoramico', 'Receita - anti-inflamatorio']),
    content: 'Paciente compareceu para avaliacao de rotina. Sem queixas relevantes.',
    diagnosis: pick(['Gengivite leve', 'Carie oclusal', null]),
    treatment_plan: pick(['Limpeza + orientacao de higiene', 'Restauracao em resina', null]),
  });
}
const { error: recError } = await supabase.from('medical_records').insert(records);
if (recError) { console.error('medical_records insert error:', recError); process.exit(1); }
console.log(`Inserted ${records.length} medical records`);

console.log('\n=== DONE ===');
console.log(`Seeded ${appointments.length} appointments, ${transactions.length} transactions, ${records.length} medical records`);
console.log('for your existing account (', EMAIL, ') using your existing 20 patients.');
