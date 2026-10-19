# Ativação do painel compartilhado

Implementação preparada localmente. O site que já está online não muda até o novo código ser enviado ao GitHub e publicado. Esta etapa exige acesso à conta Cloudflare; os e-mails e a autenticação serão configurados pelo titular. Não publique senhas, tokens, .dev.vars ou .env no GitHub.

## Arquitetura

- `techintudo`: catálogo público, somente leitura. Mantém o endereço atual do site.
- `techintudo-admin`: painel em outro hostname. Todo o hostname exige Cloudflare Access. O backend também valida assinatura RS256, emissor, audiência, validade e lista de e-mails permitidos. Sem configuração, recusa acesso.
- Um único banco D1 `techintudo-ofertas`, binding `DB` nos dois Workers.
- A API pública nunca permite gravações. A administrativa exige login, JSON e Origin do próprio painel; controle de revisão impede sobrescrita concorrente.
- As alterações aparecem ao recarregar e, em páginas abertas, em até 30 segundos. Não é atualização instantânea por WebSocket.
- A prévia localhost continua independente em localStorage; nunca importa automaticamente seus dados para o banco.

## 1. Banco

No painel Cloudflare, abra Storage & databases → D1 e crie `techintudo-ofertas`. Copie o Database ID (UUID; não é senha). Configure os dois arquivos executando:

```powershell
node scripts/configure-d1.mjs UUID_DO_BANCO
```

Abra o console SQL do D1 e execute o conteúdo de `migrations/0001_offers.sql`. Alternativamente, em um terminal autenticado com Wrangler:

```powershell
npx wrangler d1 migrations apply techintudo-ofertas --remote --config wrangler.jsonc
```

## 2. Login Cloudflare Access

Prepare Cloudflare One / Zero Trust, usando o plano adequado ao número de usuários e verificando as condições apresentadas pela Cloudflare. Escolha o domínio de equipe, no formato `equipe.cloudflareaccess.com`, e habilite One-time PIN como opção de login.

Crie/publique o Worker `techintudo-admin` usando `npx wrangler deploy --config wrangler.admin.jsonc`. Sem as variáveis corretas ele responderá 503 e não libera administração.

No Worker administrativo → Domains → Worker URL, habilite Production e sua proteção por Cloudflare Access. Mantenha Preview desativado. Edite a aplicação Access criada para permitir SOMENTE os dois e-mails informados pelo titular. Não deixe política Everyone, Bypass ou todo o domínio gmail.com. O catálogo `techintudo` continua público.

Na aplicação Access, copie o Application Audience (AUD). Em `wrangler.admin.jsonc`, substitua ACCESS_TEAM_DOMAIN pelo domínio de equipe (sem https://) e ACCESS_AUD pelo AUD. Esses valores são identificadores, não credenciais. O placeholder mantém o painel bloqueado.

No Worker administrativo → Settings → Variables and Secrets, cadastre `ADMIN_EMAILS` como Secret com os dois e-mails separados por vírgula. Também é possível usar `npx wrangler secret put ADMIN_EMAILS --config wrangler.admin.jsonc` e inserir o valor na entrada interativa. Não cole os e-mails em arquivos públicos. Publique novamente o Worker administrativo após configurar o arquivo.

O acesso ao novo painel deve apresentar o login da Cloudflare. Cada usuário digita o próprio e-mail e o código recebido; o site não armazena senhas. Verifique também em janela anônima e com um e-mail não autorizado. O código de login é pessoal e não deve ser compartilhado.

## 3. GitHub e comandos

Agora é necessário enviar o projeto completo, não apenas dist. Arquivos necessários: `dist/`, `backend/`, `migrations/`, `scripts/configure-d1.mjs`, `wrangler.jsonc`, `wrangler.admin.jsonc`, `package.json`, `.gitignore` e documentação. Não enviar `arquivos-recebidos/`, `preview/` nem arquivos de credenciais.

Para o Worker público atual, troque Deploy command para:

```text
npx wrangler deploy --config wrangler.jsonc
```

Para o segundo Worker, conecte o MESMO repositório e use:

```text
npx wrangler deploy --config wrangler.admin.jsonc
```

Em ambos: Build command vazio, Path `/`, Preview builds desativado. Confirme nomes diferentes dos projetos e a mesma base D1. Não mantenha o comando antigo com `--assets ./dist`: ele publica somente os arquivos estáticos e não ativa nossa API.

## 4. Importar e validar

Depois de entrar no painel, clique em Gerenciar ofertas → Importar 11 ofertas iniciais. A importação preserva registros existentes; não restaura edições nem reinicia prazos já gravados. Os dois prazos fictícios começam no momento da primeira importação e passam a ser iguais para todos.

Faça uma edição por uma conta e confira na outra e no catálogo público. Encerre uma oferta e confira o botão desativado e a seção Encerradas hoje. Teste uma segunda edição concorrente: o painel deve avisar sobre conflito. A última verificação só deve ser preenchida após conferência real na loja. O registro de auditoria fica no D1, consultável via GET `/api/audit` no painel autenticado.

Os prazos fictícios, cupons de exemplo e avisos de homologação continuam nesta fase. O banco não foi preenchido com um horário de verificação inventado. Não há integração automática com marketplaces. Imagens de ofertas novas são URLs HTTPS; uploads de imagens ainda não fazem parte desta implementação.

Antes de anúncios: conferir ofertas e autorização de imagens, regras dos afiliados, domínio e privacidade; substituir exemplos. Definir também rotina de exportação/backup e recuperação do banco.
