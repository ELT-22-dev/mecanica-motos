import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const envText = fs.readFileSync('c:/Users/joedl/Downloads/dentista-premium/.env', 'utf8');
const env = Object.fromEntries(envText.split('\n').filter(Boolean).map(l => {
  const idx = l.indexOf('=');
  return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
}));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function freshUser(email) {
  const { data, error } = await supabase.auth.signUp({
    email, password: 'SecTest123!', options: { data: { display_name: 'Sec Test' } },
  });
  if (error) throw error;
  return data.user.id;
}

let pass = true;
function check(label, condition) {
  console.log(condition ? `PASS  ${label}` : `FAIL  ${label}`);
  if (!condition) pass = false;
}

// User A
const emailA = `sec.a.${Date.now()}@mailinator.com`;
const userIdA = await freshUser(emailA);

// 1. Try to insert a patient with a forged user_id (someone else's fake id)
const fakeUserId = '00000000-0000-0000-0000-000000000000';
const { data: forgedInsert, error: forgedError } = await supabase
  .from('patients')
  .insert({ user_id: fakeUserId, name: 'Forged Patient' })
  .select();
check('insert with forged user_id is rejected by RLS', !!forgedError || (forgedInsert && forgedInsert.length === 0));
if (forgedError) console.log('   (rejected with:', forgedError.message, ')');

// 2. Insert a legit patient as user A
const { data: legitPatient, error: legitError } = await supabase
  .from('patients')
  .insert({ user_id: userIdA, name: 'Legit Patient A' })
  .select()
  .single();
check('legit insert with own user_id succeeds', !legitError && !!legitPatient);

// 3. Try to UPDATE someone else's row by guessing/knowing its id (using another fresh user B)
await supabase.auth.signOut();
const emailB = `sec.b.${Date.now()}@mailinator.com`;
await freshUser(emailB);

const { data: crossUpdate, error: crossUpdateErr } = await supabase
  .from('patients')
  .update({ name: 'HACKED' })
  .eq('id', legitPatient.id)
  .select();
check('user B cannot update user A\'s patient row', !crossUpdateErr && (!crossUpdate || crossUpdate.length === 0));

// 4. Try to SELECT user A's row as user B directly by id
const { data: crossSelect } = await supabase.from('patients').select('*').eq('id', legitPatient.id);
check('user B cannot select user A\'s patient row by id', !crossSelect || crossSelect.length === 0);

// 5. Try to DELETE user A's row as user B
const { data: crossDelete } = await supabase.from('patients').delete().eq('id', legitPatient.id).select();
check('user B cannot delete user A\'s patient row', !crossDelete || crossDelete.length === 0);

// 6. Unauthenticated (anon, no session) access
await supabase.auth.signOut();
const { data: anonSelect } = await supabase.from('patients').select('*');
check('unauthenticated request returns no rows', !anonSelect || anonSelect.length === 0);

console.log('\n' + (pass ? '=== ALL SECURITY CHECKS PASSED ===' : '=== SOME CHECKS FAILED — REVIEW ABOVE ==='));
process.exit(pass ? 0 : 1);
