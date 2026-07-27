-- Performance indices — rode isto no SQL Editor do Supabase (mesma tela onde
-- voce rodou o supabase-schema.sql). Seguro rodar mais de uma vez (IF NOT EXISTS).
--
-- Por que importa: toda consulta ja passa por um filtro invisivel de seguranca
-- (RLS: "so mostre linhas onde user_id = voce"). Sem indice em user_id, o
-- banco tem que examinar a tabela inteira em toda consulta para aplicar esse
-- filtro. Os indices em client_id/vehicle_id/service_order_id ajudam Postgres
-- a buscar e apagar/atualizar rapido quando um registro relacionado muda.

create index if not exists clients_user_id_idx on clients(user_id);
create index if not exists clients_name_idx on clients(name);

create index if not exists vehicles_user_id_idx on vehicles(user_id);
create index if not exists vehicles_client_id_idx on vehicles(client_id);
create index if not exists vehicles_plate_idx on vehicles(plate);

create index if not exists appointments_user_id_idx on appointments(user_id);
create index if not exists appointments_client_id_idx on appointments(client_id);
create index if not exists appointments_date_idx on appointments(date);

create index if not exists parts_user_id_idx on parts(user_id);
create index if not exists parts_name_idx on parts(name);
create index if not exists parts_sku_idx on parts(sku);

create index if not exists service_orders_user_id_idx on service_orders(user_id);
create index if not exists service_orders_client_id_idx on service_orders(client_id);
create index if not exists service_orders_vehicle_id_idx on service_orders(vehicle_id);
create index if not exists service_orders_status_idx on service_orders(status);

create index if not exists service_order_items_user_id_idx on service_order_items(user_id);
create index if not exists service_order_items_service_order_id_idx on service_order_items(service_order_id);
create index if not exists service_order_items_part_id_idx on service_order_items(part_id);

create index if not exists transactions_user_id_idx on transactions(user_id);
create index if not exists transactions_client_id_idx on transactions(client_id);
create index if not exists transactions_service_order_id_idx on transactions(service_order_id);
