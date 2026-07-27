-- Nome e logo da clinica — rode isto no SQL Editor do Supabase.
-- Guardado numa tabela separada (nao no perfil do usuario) porque o perfil
-- fica dentro do token de login (JWT), que tem limite de tamanho pequeno —
-- uma imagem la dentro quebraria o login. Aqui fica de fora, sem esse limite.

create table if not exists clinic_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  clinic_name text,
  logo_data_url text,
  updated_at timestamptz not null default now()
);

alter table clinic_settings enable row level security;

-- So o dono edita, mas qualquer um pode ler (nome/logo aparecem ate na tela
-- de login, antes de entrar — nao e informacao sensivel).
create policy "clinic_settings_public_read" on clinic_settings
  for select using (true);

create policy "clinic_settings_owner_write" on clinic_settings
  for insert with check (auth.uid() = user_id);

create policy "clinic_settings_owner_update" on clinic_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
