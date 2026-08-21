/**
 * Example data for the portfolio/demo build (`VITE_DEMO_MODE=true`). Seeds a
 * fictional workshop with clients, vehicles, parts, service orders and
 * transactions so every screen has something realistic to show — this data
 * exists only in the visitor's own browser (`localStorage`), never sent
 * anywhere.
 */
import { writeLocalTable } from './localStore'

const SEED_FLAG_KEY = 'motomanage_demo_seeded_v1'

const iso = (d: Date) => d.toISOString()
const dateOnly = (d: Date) => d.toISOString().slice(0, 10)
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function buildSeedData() {
  const clients = [
    {
      id: 'demo-cli-1', name: 'Carlos Eduardo Santos', cpf_cnpj: '123.456.789-01',
      phone: '(11) 98765-4321', whatsapp: '(11) 98765-4321', email: 'carlos.santos@email.com',
      address: 'Rua das Flores, 123', city: 'Sao Paulo', state: 'SP', zip: '01234-567',
      notes: null, status: 'active', created_at: iso(daysAgo(180)),
    },
    {
      id: 'demo-cli-2', name: 'Mariana Oliveira Costa', cpf_cnpj: '234.567.890-12',
      phone: '(11) 91234-5678', whatsapp: '(11) 91234-5678', email: 'mariana.costa@email.com',
      address: 'Av. Paulista, 900', city: 'Sao Paulo', state: 'SP', zip: '01310-100',
      notes: null, status: 'active', created_at: iso(daysAgo(150)),
    },
    {
      id: 'demo-cli-3', name: 'Roberto Almeida Ferreira', cpf_cnpj: '345.678.901-23',
      phone: '(11) 99887-6655', whatsapp: '(11) 99887-6655', email: 'roberto.ferreira@email.com',
      address: 'Rua Augusta, 456', city: 'Sao Paulo', state: 'SP', zip: '01305-000',
      notes: 'Cliente antigo, sempre traz as duas motos', status: 'active', created_at: iso(daysAgo(300)),
    },
    {
      id: 'demo-cli-4', name: 'Juliana Pereira Lima', cpf_cnpj: '456.789.012-34',
      phone: '(11) 98111-2233', whatsapp: '(11) 98111-2233', email: 'juliana.lima@email.com',
      address: 'Rua Oscar Freire, 77', city: 'Sao Paulo', state: 'SP', zip: '01426-001',
      notes: null, status: 'active', created_at: iso(daysAgo(90)),
    },
    {
      id: 'demo-cli-5', name: 'Fernando Souza Rocha', cpf_cnpj: '567.890.123-45',
      phone: '(11) 97222-3344', whatsapp: null, email: 'fernando.rocha@email.com',
      address: 'Rua Vergueiro, 200', city: 'Sao Paulo', state: 'SP', zip: '01504-000',
      notes: 'Mudou de cidade, nao e mais cliente ativo', status: 'inactive', created_at: iso(daysAgo(400)),
    },
  ]

  const vehicles = [
    { id: 'demo-veh-1', client_id: 'demo-cli-1', client_name: 'Carlos Eduardo Santos', brand: 'Honda', model: 'CG 160 Titan', year: '2022', plate: 'ABC1D23', color: 'Vermelha', chassis: '9C2KC1230NR012345', mileage: 15320, notes: null, created_at: iso(daysAgo(180)) },
    { id: 'demo-veh-2', client_id: 'demo-cli-2', client_name: 'Mariana Oliveira Costa', brand: 'Yamaha', model: 'Fazer 250', year: '2021', plate: 'XYZ9K87', color: 'Azul', chassis: '9C6KE0820M0034567', mileage: 22100, notes: null, created_at: iso(daysAgo(150)) },
    { id: 'demo-veh-3', client_id: 'demo-cli-3', client_name: 'Roberto Almeida Ferreira', brand: 'Honda', model: 'CB 500F', year: '2023', plate: 'DEF4G56', color: 'Preta', chassis: '9C2PC4110PR098765', mileage: 8400, notes: null, created_at: iso(daysAgo(300)) },
    { id: 'demo-veh-4', client_id: 'demo-cli-3', client_name: 'Roberto Almeida Ferreira', brand: 'Honda', model: 'Biz 125', year: '2020', plate: 'GHI8L90', color: 'Branca', chassis: '9C2JC5090LR054321', mileage: 31500, notes: 'Segunda moto do cliente', created_at: iso(daysAgo(280)) },
    { id: 'demo-veh-5', client_id: 'demo-cli-4', client_name: 'Juliana Pereira Lima', brand: 'Yamaha', model: 'MT-03', year: '2022', plate: 'HIJ7K12', color: 'Cinza', chassis: '9C6MJ0410N0076543', mileage: 12750, notes: null, created_at: iso(daysAgo(90)) },
    { id: 'demo-veh-6', client_id: 'demo-cli-5', client_name: 'Fernando Souza Rocha', brand: 'Honda', model: 'CG 125 Fan', year: '2019', plate: 'KLM3N45', color: 'Preta', chassis: '9C2JC4980KR011223', mileage: 45200, notes: null, created_at: iso(daysAgo(400)) },
  ]

  const parts = [
    { id: 'demo-part-1', name: 'Oleo Motor 10W30 1L', sku: 'OL-1030', category: 'Lubrificantes', brand: 'Motul', unit_price: 45.00, cost_price: 28.00, quantity: 25, min_quantity: 10, supplier: 'Distribuidora Center Oil', location: 'Prateleira A1', created_at: iso(daysAgo(170)) },
    { id: 'demo-part-2', name: 'Pastilha de Freio Dianteira', sku: 'PF-2201', category: 'Freios', brand: 'Frasle', unit_price: 89.90, cost_price: 52.00, quantity: 3, min_quantity: 5, supplier: 'Auto Pecas Brasil', location: 'Prateleira B3', created_at: iso(daysAgo(170)) },
    { id: 'demo-part-3', name: 'Filtro de Oleo', sku: 'FO-3310', category: 'Filtros', brand: 'Tecfil', unit_price: 22.50, cost_price: 12.00, quantity: 15, min_quantity: 8, supplier: 'Distribuidora Center Oil', location: 'Prateleira A2', created_at: iso(daysAgo(170)) },
    { id: 'demo-part-4', name: 'Corrente de Transmissao 428H', sku: 'CT-4401', category: 'Transmissao', brand: 'KMC', unit_price: 145.00, cost_price: 95.00, quantity: 2, min_quantity: 3, supplier: 'Moto Pecas SP', location: 'Prateleira C1', created_at: iso(daysAgo(160)) },
    { id: 'demo-part-5', name: 'Kit Relacao Completo', sku: 'KR-5501', category: 'Transmissao', brand: 'Vaz', unit_price: 210.00, cost_price: 140.00, quantity: 6, min_quantity: 2, supplier: 'Moto Pecas SP', location: 'Prateleira C2', created_at: iso(daysAgo(160)) },
    { id: 'demo-part-6', name: 'Vela de Ignicao', sku: 'VI-6601', category: 'Ignicao/Motor', brand: 'NGK', unit_price: 18.00, cost_price: 9.50, quantity: 20, min_quantity: 10, supplier: 'Auto Pecas Brasil', location: 'Prateleira A3', created_at: iso(daysAgo(170)) },
    { id: 'demo-part-7', name: 'Camara de Ar Traseira', sku: 'CA-7701', category: 'Pneus', brand: 'Levorin', unit_price: 35.00, cost_price: 20.00, quantity: 1, min_quantity: 4, supplier: 'Moto Pecas SP', location: 'Prateleira D1', created_at: iso(daysAgo(150)) },
    { id: 'demo-part-8', name: 'Bateria 12V 5Ah', sku: 'BT-8801', category: 'Eletrica', brand: 'Moura', unit_price: 180.00, cost_price: 120.00, quantity: 4, min_quantity: 2, supplier: 'Distribuidora Eletro Moto', location: 'Prateleira E1', created_at: iso(daysAgo(140)) },
  ]

  const serviceOrders = [
    {
      id: 'demo-os-1', client_id: 'demo-cli-1', client_name: 'Carlos Eduardo Santos',
      vehicle_id: 'demo-veh-1', vehicle_label: 'Honda CG 160 Titan (ABC1D23)', mechanic_name: 'Joao Mecanico',
      status: 'delivered', problem_description: 'Revisao geral + troca de oleo',
      diagnosis: 'Oleo vencido, demais itens dentro do padrao', notes: null,
      labor_cost: 0, discount: 0, total: 192.50,
      opened_at: iso(daysAgo(55)), completed_at: iso(daysAgo(53)), created_at: iso(daysAgo(55)),
    },
    {
      id: 'demo-os-2', client_id: 'demo-cli-2', client_name: 'Mariana Oliveira Costa',
      vehicle_id: 'demo-veh-2', vehicle_label: 'Yamaha Fazer 250 (XYZ9K87)', mechanic_name: 'Joao Mecanico',
      status: 'completed', problem_description: 'Falha na partida a frio',
      diagnosis: 'Velas desgastadas e carburacao desregulada', notes: 'Cliente satisfeito com o resultado',
      labor_cost: 0, discount: 10.00, total: 96.00,
      opened_at: iso(daysAgo(20)), completed_at: iso(daysAgo(18)), created_at: iso(daysAgo(20)),
    },
    {
      id: 'demo-os-3', client_id: 'demo-cli-3', client_name: 'Roberto Almeida Ferreira',
      vehicle_id: 'demo-veh-3', vehicle_label: 'Honda CB 500F (DEF4G56)', mechanic_name: 'Pedro Mecanico',
      status: 'in_progress', problem_description: 'Barulho ao frear e freio "puxando"',
      diagnosis: 'Pastilhas dianteiras no limite', notes: null,
      labor_cost: 0, discount: 0, total: 229.80,
      opened_at: iso(daysAgo(4)), completed_at: null, created_at: iso(daysAgo(4)),
    },
    {
      id: 'demo-os-4', client_id: 'demo-cli-4', client_name: 'Juliana Pereira Lima',
      vehicle_id: 'demo-veh-5', vehicle_label: 'Yamaha MT-03 (HIJ7K12)', mechanic_name: 'Pedro Mecanico',
      status: 'waiting_parts', problem_description: 'Corrente esticada, moto arriando',
      diagnosis: 'Necessario trocar corrente e kit relacao - peca com estoque baixo', notes: null,
      labor_cost: 0, discount: 0, total: 145.00,
      opened_at: iso(daysAgo(2)), completed_at: null, created_at: iso(daysAgo(2)),
    },
    {
      id: 'demo-os-5', client_id: 'demo-cli-3', client_name: 'Roberto Almeida Ferreira',
      vehicle_id: 'demo-veh-4', vehicle_label: 'Honda Biz 125 (GHI8L90)', mechanic_name: 'Joao Mecanico',
      status: 'open', problem_description: 'Barulho estranho na partida', diagnosis: null, notes: null,
      labor_cost: 0, discount: 0, total: 0,
      opened_at: iso(daysAgo(0)), completed_at: null, created_at: iso(daysAgo(0)),
    },
    {
      id: 'demo-os-6', client_id: 'demo-cli-5', client_name: 'Fernando Souza Rocha',
      vehicle_id: 'demo-veh-6', vehicle_label: 'Honda CG 125 Fan (KLM3N45)', mechanic_name: null,
      status: 'cancelled', problem_description: 'Cliente desistiu do servico', diagnosis: null, notes: null,
      labor_cost: 0, discount: 0, total: 0,
      opened_at: iso(daysAgo(35)), completed_at: null, created_at: iso(daysAgo(35)),
    },
  ]

  const serviceOrderItems = [
    { id: 'demo-osi-1', service_order_id: 'demo-os-1', part_id: 'demo-part-1', item_type: 'part', description: 'Oleo Motor 10W30 1L', quantity: 2, unit_price: 45.00, total: 90.00, created_at: iso(daysAgo(55)) },
    { id: 'demo-osi-2', service_order_id: 'demo-os-1', part_id: 'demo-part-3', item_type: 'part', description: 'Filtro de Oleo', quantity: 1, unit_price: 22.50, total: 22.50, created_at: iso(daysAgo(55)) },
    { id: 'demo-osi-3', service_order_id: 'demo-os-1', part_id: null, item_type: 'labor', description: 'Troca de oleo e filtro + revisao geral', quantity: 1, unit_price: 80.00, total: 80.00, created_at: iso(daysAgo(55)) },
    { id: 'demo-osi-4', service_order_id: 'demo-os-2', part_id: 'demo-part-6', item_type: 'part', description: 'Vela de Ignicao', quantity: 2, unit_price: 18.00, total: 36.00, created_at: iso(daysAgo(20)) },
    { id: 'demo-osi-5', service_order_id: 'demo-os-2', part_id: null, item_type: 'labor', description: 'Troca de velas e ajuste de carburacao', quantity: 1, unit_price: 70.00, total: 70.00, created_at: iso(daysAgo(20)) },
    { id: 'demo-osi-6', service_order_id: 'demo-os-3', part_id: 'demo-part-2', item_type: 'part', description: 'Pastilha de Freio Dianteira', quantity: 2, unit_price: 89.90, total: 179.80, created_at: iso(daysAgo(4)) },
    { id: 'demo-osi-7', service_order_id: 'demo-os-3', part_id: null, item_type: 'labor', description: 'Troca de pastilhas de freio dianteiras', quantity: 1, unit_price: 50.00, total: 50.00, created_at: iso(daysAgo(4)) },
    { id: 'demo-osi-8', service_order_id: 'demo-os-4', part_id: 'demo-part-4', item_type: 'part', description: 'Corrente de Transmissao 428H', quantity: 1, unit_price: 145.00, total: 145.00, created_at: iso(daysAgo(2)) },
  ]

  const transactions = [
    { id: 'demo-tx-1', client_id: 'demo-cli-1', client_name: 'Carlos Eduardo Santos', service_order_id: 'demo-os-1', type: 'income', category: 'Ordem de Servico', description: 'OS - Honda CG 160 Titan (ABC1D23)', amount: 192.50, payment_method: 'pix', status: 'paid', installments: 1, current_installment: 1, due_date: null, paid_date: dateOnly(daysAgo(53)), created_at: iso(daysAgo(53)) },
    { id: 'demo-tx-2', client_id: 'demo-cli-2', client_name: 'Mariana Oliveira Costa', service_order_id: 'demo-os-2', type: 'income', category: 'Ordem de Servico', description: 'OS - Yamaha Fazer 250 (XYZ9K87)', amount: 96.00, payment_method: 'cartao', status: 'paid', installments: 1, current_installment: 1, due_date: null, paid_date: dateOnly(daysAgo(18)), created_at: iso(daysAgo(18)) },
    { id: 'demo-tx-3', client_id: 'demo-cli-3', client_name: 'Roberto Almeida Ferreira', service_order_id: 'demo-os-3', type: 'income', category: 'Ordem de Servico', description: 'OS em andamento - Honda CB 500F', amount: 229.80, payment_method: 'a definir', status: 'pending', installments: 1, current_installment: 1, due_date: dateOnly(daysAgo(-3)), paid_date: null, created_at: iso(daysAgo(4)) },
    { id: 'demo-tx-4', client_id: null, client_name: null, service_order_id: null, type: 'expense', category: 'Compra de pecas', description: 'Reposicao de estoque - pastilhas e correntes', amount: 850.00, payment_method: 'boleto', status: 'paid', installments: 1, current_installment: 1, due_date: null, paid_date: dateOnly(daysAgo(10)), created_at: iso(daysAgo(10)) },
    { id: 'demo-tx-5', client_id: null, client_name: null, service_order_id: null, type: 'expense', category: 'Aluguel', description: 'Aluguel do galpao', amount: 2200.00, payment_method: 'transferencia', status: 'paid', installments: 1, current_installment: 1, due_date: null, paid_date: dateOnly(daysAgo(5)), created_at: iso(daysAgo(5)) },
    { id: 'demo-tx-6', client_id: null, client_name: null, service_order_id: null, type: 'expense', category: 'Energia eletrica', description: 'Conta de luz', amount: 340.00, payment_method: 'boleto', status: 'pending', installments: 1, current_installment: 1, due_date: dateOnly(daysAgo(-10)), paid_date: null, created_at: iso(daysAgo(2)) },
    { id: 'demo-tx-7', client_id: null, client_name: null, service_order_id: null, type: 'expense', category: 'Salarios', description: 'Salario mecanico - quinzena', amount: 1800.00, payment_method: 'transferencia', status: 'paid', installments: 1, current_installment: 1, due_date: null, paid_date: dateOnly(daysAgo(15)), created_at: iso(daysAgo(15)) },
    { id: 'demo-tx-8', client_id: 'demo-cli-4', client_name: 'Juliana Pereira Lima', service_order_id: null, type: 'income', category: 'Ordem de Servico', description: 'OS - revisao geral', amount: 310.00, payment_method: 'dinheiro', status: 'paid', installments: 1, current_installment: 1, due_date: null, paid_date: dateOnly(daysAgo(70)), created_at: iso(daysAgo(70)) },
    { id: 'demo-tx-9', client_id: 'demo-cli-1', client_name: 'Carlos Eduardo Santos', service_order_id: null, type: 'income', category: 'Ordem de Servico', description: 'OS - troca de pneus', amount: 480.00, payment_method: 'pix', status: 'paid', installments: 1, current_installment: 1, due_date: null, paid_date: dateOnly(daysAgo(95)), created_at: iso(daysAgo(95)) },
    { id: 'demo-tx-10', client_id: null, client_name: null, service_order_id: null, type: 'expense', category: 'Manutencao de equipamentos', description: 'Manutencao do elevador', amount: 420.00, payment_method: 'cartao', status: 'paid', installments: 1, current_installment: 1, due_date: null, paid_date: dateOnly(daysAgo(40)), created_at: iso(daysAgo(40)) },
  ]

  const appointments = [
    { id: 'demo-appt-1', client_id: 'demo-cli-1', client_name: 'Carlos Eduardo Santos', vehicle_id: 'demo-veh-1', vehicle_label: 'Honda CG 160 Titan (ABC1D23)', mechanic_name: 'Joao Mecanico', date: dateOnly(daysAgo(0)), time: '09:00', service_type: 'Revisao', notes: null, status: 'scheduled' },
    { id: 'demo-appt-2', client_id: 'demo-cli-3', client_name: 'Roberto Almeida Ferreira', vehicle_id: 'demo-veh-4', vehicle_label: 'Honda Biz 125 (GHI8L90)', mechanic_name: 'Pedro Mecanico', date: dateOnly(daysAgo(0)), time: '14:30', service_type: 'Diagnostico', notes: 'Barulho na partida', status: 'confirmed' },
    { id: 'demo-appt-3', client_id: 'demo-cli-4', client_name: 'Juliana Pereira Lima', vehicle_id: 'demo-veh-5', vehicle_label: 'Yamaha MT-03 (HIJ7K12)', mechanic_name: 'Pedro Mecanico', date: dateOnly(daysAgo(-1)), time: '10:00', service_type: 'Troca de oleo', notes: null, status: 'scheduled' },
    { id: 'demo-appt-4', client_id: 'demo-cli-2', client_name: 'Mariana Oliveira Costa', vehicle_id: 'demo-veh-2', vehicle_label: 'Yamaha Fazer 250 (XYZ9K87)', mechanic_name: 'Joao Mecanico', date: dateOnly(daysAgo(-3)), time: '11:00', service_type: 'Revisao geral', notes: null, status: 'scheduled' },
    { id: 'demo-appt-5', client_id: 'demo-cli-1', client_name: 'Carlos Eduardo Santos', vehicle_id: 'demo-veh-1', vehicle_label: 'Honda CG 160 Titan (ABC1D23)', mechanic_name: 'Joao Mecanico', date: dateOnly(daysAgo(2)), time: '15:00', service_type: 'Troca de pneu', notes: null, status: 'completed' },
    { id: 'demo-appt-6', client_id: 'demo-cli-5', client_name: 'Fernando Souza Rocha', vehicle_id: 'demo-veh-6', vehicle_label: 'Honda CG 125 Fan (KLM3N45)', mechanic_name: 'Joao Mecanico', date: dateOnly(daysAgo(5)), time: '09:30', service_type: 'Revisao', notes: null, status: 'no_show' },
    { id: 'demo-appt-7', client_id: 'demo-cli-3', client_name: 'Roberto Almeida Ferreira', vehicle_id: 'demo-veh-3', vehicle_label: 'Honda CB 500F (DEF4G56)', mechanic_name: 'Pedro Mecanico', date: dateOnly(daysAgo(1)), time: '16:00', service_type: 'Diagnostico eletrico', notes: null, status: 'cancelled' },
  ]

  const workshopSettings = [
    { id: 'demo-workshop', workshop_name: 'Moto Veloz Oficina', logo_data_url: null, updated_at: iso(daysAgo(0)) },
  ]

  return { clients, vehicles, parts, service_orders: serviceOrders, service_order_items: serviceOrderItems, transactions, appointments, workshop_settings: workshopSettings }
}

function writeSeed() {
  const data = buildSeedData()
  for (const [table, rows] of Object.entries(data)) {
    writeLocalTable(table, rows as Record<string, unknown>[])
  }
}

/** Seeds example data once per browser — never overwrites data the visitor has since created/edited. */
export function seedDemoDataIfNeeded() {
  if (localStorage.getItem(SEED_FLAG_KEY)) return
  writeSeed()
  localStorage.setItem(SEED_FLAG_KEY, '1')
}

/** Wipes everything and re-seeds fresh example data — used by the "Restaurar dados de demonstracao" action. */
export function resetDemoData() {
  writeSeed()
  localStorage.setItem(SEED_FLAG_KEY, '1')
}
