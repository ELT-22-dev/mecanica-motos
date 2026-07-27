-- Performance indices — rode isto no SQL Editor do Supabase (mesma tela onde
-- voce rodou o supabase-schema.sql). Seguro rodar mais de uma vez (IF NOT EXISTS).
--
-- Por que importa: toda consulta ja passa por um filtro invisivel de seguranca
-- (RLS: "so mostre linhas onde user_id = voce"). Sem indice em user_id, o
-- banco tem que examinar a tabela inteira em toda consulta para aplicar esse
-- filtro. Os indices em patient_id ajudam Postgres a apagar/atualizar rapido
-- quando um paciente e excluido (cascata pros prontuarios, etc).

create index if not exists patients_user_id_idx on patients(user_id);
create index if not exists patients_name_idx on patients(name);

create index if not exists appointments_user_id_idx on appointments(user_id);
create index if not exists appointments_patient_id_idx on appointments(patient_id);
create index if not exists appointments_date_idx on appointments(date);

create index if not exists transactions_user_id_idx on transactions(user_id);
create index if not exists transactions_patient_id_idx on transactions(patient_id);

create index if not exists medical_records_user_id_idx on medical_records(user_id);
create index if not exists medical_records_patient_id_idx on medical_records(patient_id);
