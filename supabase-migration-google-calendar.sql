-- Google Calendar sync — rode isto no SQL Editor do Supabase.
-- Guarda o ID do evento correspondente no Google Calendar, para permitir
-- atualizar/excluir o evento certo quando a consulta for cancelada ou apagada.

alter table appointments add column if not exists google_event_id text;
