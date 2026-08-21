# MotoManage Pro

Sistema completo de gestão para oficinas mecânicas especializadas em motos — clientes, veículos,
agendamentos, ordens de serviço (mão de obra + peças), estoque com alertas de baixa, financeiro e
relatórios gerenciais, tudo em uma interface web única.

Construído como um app **single-tenant e auto-hospedado**: cada oficina roda sua própria instância
com seu próprio arquivo de banco de dados (SQLite) — não depende de nenhum serviço de terceiros e
não é um SaaS multi-cliente. Não há tela de login: é uma única oficina usando o sistema.

> Este repositório também tem um **modo demonstração** (`VITE_DEMO_MODE=true`), usado apenas para
> mostrar o sistema como portfólio — roda 100% no navegador (sem backend), com dados de exemplo.
> Não é como o sistema real roda para uma oficina de verdade; veja "Modo demonstração" abaixo.

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
- [TanStack Router](https://tanstack.com/router) (file-based, SPA — sem SSR)
- [TanStack Query](https://tanstack.com/query) para cache/estado de dados
- [Express](https://expressjs.com) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
  como backend — um pequeno servidor próprio auto-hospedado, sem depender de nenhum serviço de
  terceiros (ver `server/`)
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix UI)
- [Recharts](https://recharts.org) para os gráficos do Financeiro/Relatórios
- [Vite](https://vitejs.dev)

## Rodando localmente

```bash
npm install --legacy-peer-deps
npm run dev              # sobe a API (:3001) e o Vite dev server (:3000) juntos
```

Passo a passo completo de implantação (build de produção, manter o servidor rodando, hospedagem)
em [`docs/IMPLANTACAO.md`](docs/IMPLANTACAO.md).

## Scripts

```bash
npm run build             # build de producao (SPA estatica) em dist/
npm start                 # roda o servidor de producao (API + dist/) em :3001
npm run preview           # preview do build de producao (só o front-end, sem API)
npx tsc --noEmit          # checagem de tipos
npm run lint:js           # ESLint
npm run lint:css          # Stylelint
```

## Arquitetura

Backend próprio e pequeno: os componentes React chamam `src/blink/client.ts`, que fala com a API
REST servida por `server/index.mjs` (Express + SQLite via `better-sqlite3`) — sem depender de
nenhum serviço de terceiros. Veja [`CLAUDE.md`](CLAUDE.md) para detalhes de arquitetura, modelo de
dados e decisões de design.

## Modo demonstração (portfólio, sem backend)

Este repositório fica só com o código-fonte, sem nenhum site publicado — mas existe um modo
100% front-end para rodar/mostrar o sistema sem precisar montar o backend: em vez de chamar a
API, `src/blink/client.ts` usa `src/blink/localStore.ts` (dados em `localStorage` do navegador),
semeados com um cenário de exemplo por `src/blink/demoSeed.ts`. Basta buildar com a variável de
ambiente `VITE_DEMO_MODE=true`:

```bash
VITE_DEMO_MODE=true npm run build
npm run preview   # abre o build em http://localhost:4173, sem nenhum servidor de API rodando
```

Um badge "DEMO" aparece na barra lateral sempre que esse modo está ativo, e um botão em
Configuracoes permite restaurar os dados de exemplo a qualquer momento. Se um dia quiser publicar
isso em algum lugar (GitHub Pages, Netlify, etc.), a variável `VITE_BASE_PATH` (lida em
`vite.config.ts`) ajusta os caminhos dos arquivos caso a hospedagem sirva de um subcaminho em vez
da raiz do domínio, e `src/router.tsx` já usa navegação por hash (`#/rota`) neste modo para
funcionar em qualquer hospedagem estática sem configuração de rewrite.

**Isso não é como o sistema roda de verdade para uma oficina** — para isso, veja
`docs/IMPLANTACAO.md`.
