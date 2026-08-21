# Guia de Implantação — MotoManage Pro

Este documento explica como colocar o sistema no ar **para uma oficina especifica**. Cada
oficina tem sua propria instalacao, com seu proprio banco de dados — nada e compartilhado entre
oficinas diferentes (nao e um SaaS multi-cliente), e nao depende de nenhum servico de terceiros
(Supabase, Vercel, etc.): tudo roda num unico processo Node que voce mesmo hospeda.

Guarde este arquivo junto do codigo. Se precisar montar o sistema para uma nova oficina do zero,
siga os passos na ordem.

---

## 1. Como o sistema funciona

- **Banco de dados**: um unico arquivo SQLite (`data/motomanage.db`), criado automaticamente na
  primeira vez que o servidor roda. Nao precisa de conta em nenhum servico externo.
- **Servidor**: um processo Node (`server/index.mjs`) que serve tanto a API quanto os arquivos do
  site (a pasta `dist/` gerada pelo build). Ele precisa ficar **rodando o tempo todo** enquanto a
  oficina for usar o sistema — diferente de um site estatico, aqui existe um servidor de verdade.
- **Login**: nao existe. O sistema abre direto no Dashboard — e uma unica oficina usando, entao
  nao ha necessidade de conta/senha. Isso tambem significa que **qualquer pessoa com acesso a
  maquina/rede onde o servidor roda consegue usar o sistema** (ver secao 5 sobre exposicao na
  internet).

## 2. Preparar o servidor

Requisitos: [Node.js](https://nodejs.org) 20 ou mais recente instalado na maquina/servidor que vai
rodar o sistema.

```bash
npm install --legacy-peer-deps   # instala as dependencias (inclui compilar o better-sqlite3)
npm run build                     # gera a pasta dist/ (front-end de producao)
npm start                         # sobe o servidor em http://localhost:3001 (serve dist/ + API)
```

- A porta padrao e `3001`; para mudar, defina a variavel de ambiente `PORT` antes de rodar
  (`PORT=8080 npm start`).
- O banco fica em `data/motomanage.db` por padrao; para guardar em outro lugar (ex: um disco com
  backup automatico), defina `DB_PATH=/caminho/para/motomanage.db`.
- **Backup do banco**: basta copiar o arquivo `data/motomanage.db` (idealmente com o servidor
  parado, ou usando a rotina de backup do proprio sistema em Configuracoes → "Exportar backup",
  que gera um `.json` com todos os dados).

## 3. Manter o servidor rodando

`npm start` roda em primeiro plano — se fechar o terminal, o sistema para. Para produção, use um
gerenciador de processos que reinicia o servidor sozinho se cair ou se a maquina reiniciar:

### Opcao A — PM2 (mais simples, funciona em Windows/Linux/Mac)

```bash
npm install -g pm2
pm2 start server/index.mjs --name motomanage
pm2 save
pm2 startup   # segue as instrucoes impressas para iniciar o PM2 junto com o sistema operacional
```

### Opcao B — systemd (Linux/VPS)

Crie `/etc/systemd/system/motomanage.service`:

```ini
[Unit]
Description=MotoManage Pro
After=network.target

[Service]
WorkingDirectory=/caminho/para/mecanica-motos
ExecStart=/usr/bin/node server/index.mjs
Restart=always
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

Depois: `sudo systemctl enable --now motomanage`.

## 4. Onde rodar

- **Na propria maquina da oficina** (um PC/mini-PC dedicado): o sistema fica acessivel apenas na
  rede local (outros computadores/celulares da oficina acessam via `http://IP-DA-MAQUINA:3001`).
  Simples, sem custo de hospedagem, mas so acessivel dentro da oficina.
- **Um VPS barato** (ex: qualquer provedor que ofereça uma maquina Linux com Node instalavel):
  acessivel de qualquer lugar. Nesse caso, configure um dominio + HTTPS na frente (ver secao 5).

Hospedagem 100% estatica (Vercel free, Netlify, Hostinger compartilhado) **nao serve mais** —
esses planos nao rodam um processo Node persistente, e agora o sistema precisa de um.

## 5. Expor na internet (opcional) — dominio + HTTPS + protecao de acesso

Se o servidor for acessado de fora da rede da oficina (ex: dono quer ver o financeiro de casa),
coloque um proxy reverso (nginx, Caddy) na frente do processo Node para dar HTTPS com um dominio
proprio. **Como nao ha login**, tambem vale adicionar autenticacao no proprio proxy reverso (ex:
`auth_basic` do nginx, ou Basic Auth do Caddy) ou restringir por VPN, para nao deixar os dados da
oficina abertos a qualquer um que descubra a URL.

## 6. Checklist rapido para uma oficina nova

- [ ] Node.js instalado na maquina/servidor
- [ ] `npm install --legacy-peer-deps` e `npm run build` rodados
- [ ] `npm start` (ou PM2/systemd) rodando e reiniciando sozinho se cair
- [ ] Testado o caminho feliz: cadastro de cliente, veiculo, agenda, ordem de servico, estoque,
      financeiro
- [ ] Rotina de backup combinada (copiar `data/motomanage.db` periodicamente, ou usar o botao
      "Exportar backup" em Configuracoes)
- [ ] Se acessivel pela internet: dominio + HTTPS + autenticacao no proxy reverso configurados
