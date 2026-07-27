# MotoManage Pro

Sistema completo de gestão para oficinas mecânicas especializadas em motos — clientes, veículos,
agendamentos, ordens de serviço (mão de obra + peças), estoque com alertas de baixa, financeiro e
relatórios gerenciais, tudo em uma interface web única.

Construído como um app **single-tenant**: cada oficina roda sua própria instância com seu próprio
projeto Supabase — não é um SaaS multi-cliente.

## Funcionalidades

- **Clientes** — cadastro completo, histórico de veículos e de ordens de serviço por cliente,
  contato rápido via WhatsApp.
- **Veículos** — motos vinculadas a cada cliente (marca, modelo, ano, placa, cor, chassi,
  quilometragem).
- **Agenda** — agendamento semanal de serviços por cliente/veículo/mecânico, com lembrete
  automático via WhatsApp.
- **Ordens de Serviço** — abertura de OS com fluxo de status (aberta → em andamento/aguardando
  peças → concluída → entregue), itens de peça (baixa automática no estoque) e mão de obra,
  cálculo de total em tempo real, impressão de orçamento e lançamento direto no financeiro.
- **Estoque** — controle de peças com preço de custo/venda, quantidade mínima e alerta visual de
  estoque baixo.
- **Financeiro** — receitas, despesas, parcelamento, gráficos de receita x despesa e despesas por
  categoria.
- **Relatórios** — faturamento por período, ordens de serviço por status, clientes que mais
  gastam, desempenho por mecânico e peças mais usadas.
- **Configurações** — identidade visual da oficina (nome/logo), tema claro/escuro, importação de
  clientes via CSV, backup/restore completo dos dados.

## Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [TanStack Router](https://tanstack.com/router) (file-based) + [TanStack Start](https://tanstack.com/start) (SSR + prerender)
- [TanStack Query](https://tanstack.com/query) para cache/estado de dados
- [Supabase](https://supabase.com) (Postgres + Auth) como backend — sem servidor próprio, o
  front-end fala direto com o Supabase e a segurança é garantida por Row Level Security
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix UI)
- [Recharts](https://recharts.org) para os gráficos do Financeiro/Relatórios
- [Vite](https://vitejs.dev)

## Rodando localmente

```bash
npm install --legacy-peer-deps
# crie um .env na raiz com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev              # http://localhost:3000
```

Passo a passo completo de implantação (criar o projeto Supabase, rodar as migrações SQL,
hospedagem) em [`docs/IMPLANTACAO.md`](docs/IMPLANTACAO.md).

## Scripts

```bash
npm run build             # build de producao (client + SSR + prerender) em dist/
npm run preview           # preview do build de producao
npx tsc --noEmit          # checagem de tipos
npm run lint:js           # ESLint
npm run lint:css          # Stylelint
```

## Arquitetura

Não há backend próprio: os componentes React chamam o Supabase diretamente pelo cliente
`src/blink/client.ts`, e a segurança é garantida inteiramente por Row Level Security no Postgres
(`supabase-schema.sql`). Veja [`CLAUDE.md`](CLAUDE.md) para detalhes de arquitetura, modelo de
dados e decisões de design.
