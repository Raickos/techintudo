# TechInTudo Ofertas

Catálogo de homologação em https://techintudo.tech-ofertas.workers.dev/. A versão online atual foi publicada pelo titular como site estático. A integração de login e banco compartilhado está preparada localmente e depende da configuração e publicação descritas em [CONFIGURAR-CLOUDFLARE.md](CONFIGURAR-CLOUDFLARE.md).

## Desenvolvimento local

Execute `node server.mjs` e abra http://127.0.0.1:4173. O servidor estático precisa de Node.js 20+. A prévia localhost usa localStorage e não se conecta ao banco. Os módulos precisam de HTTP, não abra index.html diretamente.

Execute `node --test tests/model.test.mjs tests/backend.test.mjs` com Node.js 24+ para os testes completos (usa SQLite nativo). Sem dependências externas. Os atalhos npm são opcionais.

## Versão com servidor

- `backend/worker.js`: API pública somente leitura e API administrativa protegida.
- `backend/auth.js`: validação criptográfica dos tokens Cloudflare Access e lista de e-mails autorizados.
- `migrations/`: esquema do D1 e auditoria.
- `wrangler.jsonc`: Worker público existente; `wrangler.admin.jsonc`: Worker administrativo separado. Configurar o mesmo UUID do D1 nos dois arquivos.
- `dist/api.js`: sincronização do navegador com o servidor. Fora de localhost, falhas no servidor não são substituídas por dados do navegador. Edições só aparecem como salvas depois de confirmação do servidor. Conflitos de revisão retornam 409.
- Autenticação e D1 não podem ser ativados só reenviando dist: publicar também backend, migrations e os arquivos de configuração. Não substituir a versão online antes de configurar banco e login.

## Conteúdo

11 produtos e links foram fornecidos pelo titular. As artes em assets/products foram preservadas integralmente, sem recortes. Originais e hashes estão em arquivos-recebidos, excluída do Git. Imagens novas podem ser URLs HTTPS; upload de imagens não está implementado.

Preços, frete, parcelamento e especificações não foram verificados nas lojas. O painel permite registrar a data da última conferência REAL, sem inventar horários. Não há integração automática com marketplaces, estoque ou pagamento no site.

Projetor e câmera têm prazos fictícios, identificados. Na versão com D1, prazos são fixados na primeira importação das ofertas e iguais para todos. A importação não sobrescreve registros existentes. Localmente, os prazos são fixados na primeira abertura do navegador. Encerradas ficam até o fim do dia em America/Sao_Paulo; o painel preserva o histórico. O botão de teste de 15 segundos define um novo prazo explicitamente fictício.

Conteúdos inteiramente demonstrativos não levam à loja. Links reais possuem aviso de afiliados e abrem o marketplace. WhatsApp e redes usam os identificadores fornecidos. Fontes Google são opcionais; há fallback local. Não foram incluídos pixel, analytics ou coleta de contatos.

## Operação real

Concluir a ativação e os testes com as duas contas. Definir backups e recuperação do D1. Conferir regras vigentes dos afiliados sobre domínio, tráfego pago, imagens, preços e dados. Substituir exemplos e prazos fictícios, revisar condições e informações institucionais/privacidade antes dos anúncios.

Configuração do painel administrativo.

## Paginação do catálogo

As ofertas são exibidas em páginas de até 12 itens, com navegação Anterior/Próxima e números de página. Busca, categoria, loja, tipo e ordenação retornam à primeira página. A sincronização automática preserva a página selecionada e ajusta a última página quando o número de ofertas diminui. Ofertas encerradas têm paginação independente.

Terceiro lote de 20/10/2026: dez imagens originais adicionadas em `dist/assets/products/2026-10-20/`. A inclusão das ofertas no D1 é aditiva e mantém o catálogo existente; a paginação continua com 12 itens.

Lote de 21/10/2026: doze imagens originais em `dist/assets/products/2026-10-21/`. Inclusão no D1 preserva as ofertas anteriores e mantém a paginação com 12 itens; preços e condições fornecidos pela curadoria.
