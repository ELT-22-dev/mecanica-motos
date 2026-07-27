# Guia de Implantação — MotoManage Pro

Este documento explica como colocar o sistema no ar **para uma oficina especifica**. Cada
oficina tem sua propria instalacao, com seu proprio banco de dados e credenciais — nada e
compartilhado entre oficinas diferentes (nao e um SaaS multi-cliente).

Guarde este arquivo junto do codigo. Se precisar montar o sistema para uma nova oficina do zero,
siga os passos na ordem.

---

## 1. Banco de dados (Supabase)

1. Criar conta gratuita em [supabase.com](https://supabase.com) e um novo projeto.
   - Guarde a senha do banco em lugar seguro (nao precisa dela no dia a dia).
   - Escolha uma regiao proxima do Brasil (ex: Sao Paulo / `sa-east-1`).
2. No painel do projeto, ir em **SQL Editor** e rodar, **nesta ordem**, o conteudo de cada
   arquivo da raiz do projeto:
   1. `supabase-schema.sql` — cria as tabelas principais (clientes, veiculos, agendamentos,
      pecas, ordens de servico e itens, transacoes) e ativa Row Level Security (cada conta so
      ve os proprios dados).
   2. `supabase-indices.sql` — indices de performance.
   3. `supabase-migration-workshop-branding.sql` — tabela de nome/logo da oficina.
3. Em **Authentication → Sign In / Providers → Email**:
   - Confirme que o provedor **Email** esta **ativado** (nao "Deficiente").
   - Desative **"Confirmar e-mail"**, a menos que a oficina realmente queira esse passo extra
     (para uso de uma oficina so, geralmente e desnecessario).
4. Em **Settings → API**, copiar dois valores (vao para o `.env`, passo 2):
   - **Project URL**
   - **anon public key** — **nunca** use a chave `service_role` no codigo do app; essa e secreta
     e da acesso total ao banco.

## 2. Variaveis de ambiente

Criar um arquivo `.env` na raiz do projeto (nunca commitado — ja esta no `.gitignore`):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_AQUI
```

## 3. Hospedagem

O `npm run build` gera uma pasta `dist/` **100% estatica** (HTML/JS/CSS) — nao roda nenhum
servidor Node em producao, entao qualquer hospedagem de arquivos estaticos serve.

### Opcao A — Vercel (mais simples)

- Plano gratuito ("Hobby") funciona tecnicamente para sempre, sem expiracao — mas os termos de
  uso da Vercel dizem que esse plano e para uso pessoal/nao-comercial. Para uma oficina (uso
  comercial), o correto seria o plano **Pro** (~$20/mes), mesmo que o trafego seja baixissimo.
- Configurar as variaveis de ambiente do passo 2 no painel do projeto na Vercel.
- Roteamento SPA ja funciona automaticamente na Vercel (nao precisa configurar nada extra).

### Opcao B — Hostinger (hospedagem compartilhada, nao precisa de VPS)

- Como o resultado e so arquivos estaticos, o plano de hospedagem compartilhada mais barato ja
  resolve — **nao e necessario VPS**.
- Rodar `npm run build` localmente, depois subir o **conteudo** da pasta `dist/` (nao a pasta em
  si) para `public_html` via Gerenciador de Arquivos ou FTP.
- **Precisa de um dominio** — hospedagem compartilhada normalmente nao expoe o site por IP puro,
  so por dominio vinculado ao plano.
- O arquivo `dist/_redirects` (formato Vercel/Netlify) **nao funciona no Apache da Hostinger** —
  precisa ser substituido por um `.htaccess` com regra de rewrite equivalente para o roteamento
  interno do app funcionar em links diretos (ex: abrir direto em `/clientes/123`).

### Depois de hospedar, sempre atualizar

- **Supabase** → Authentication → URL Configuration → atualizar a "Site URL" para a URL final
  (usada nos links de "esqueci minha senha" — se nao atualizar, o link de redefinicao de senha
  aponta para o lugar errado).

## 4. Checklist rapido para uma oficina nova

- [ ] Projeto Supabase criado, os 3 arquivos SQL rodados na ordem
- [ ] Confirmacao de email desativada (ou aceitar o fluxo com confirmacao, se preferir)
- [ ] `.env` preenchido com URL + chave anon do Supabase
- [ ] Build gerado e hospedado (Vercel ou Hostinger)
- [ ] Dominio apontando para a hospedagem
- [ ] Supabase atualizado com a URL final de producao
- [ ] Login de teste criado e conferido (cadastro de cliente, veiculo, agenda, ordem de servico,
      estoque, financeiro)
