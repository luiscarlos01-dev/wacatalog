# Quickstart — Gestão de produtos

Este guia valida a feature sem dados de produção nem credenciais commitadas.

## Prerequisites

- Node.js `24.19.0` e pnpm `11.22.0`.
- Supabase CLI para validação local de migration e policy.
- Um projeto Supabase local ou não produtivo configurado fora do repositório,
  já com as migrations da feature 001 aplicadas (`stores`,
  `store_memberships`).
- As mesmas identidades de teste já provisionadas pela feature 001
  (administrador A/loja A, administrador B/loja B), reaproveitadas para o
  isolamento cross-tenant desta feature — nenhuma conta nova é necessária.
- Arquivos de imagem de teste fora do repositório (não commitados): um JPEG
  válido, um HEIC válido, um arquivo acima de 10 MB e um arquivo de formato
  não aceito (ex.: `.gif`), para os cenários de upload.

Variáveis de ambiente reaproveitadas da feature 001 (só nomes, valores nunca
neste arquivo, em fixture ou em log):

```text
E2E_ADMIN_EMAIL
E2E_ADMIN_PASSWORD
E2E_SECOND_ADMIN_EMAIL
E2E_SECOND_ADMIN_PASSWORD
```

## Database foundation checks

```sh
supabase db reset
supabase test db
```

O reset deve aplicar, nesta ordem, as migrations já existentes seguidas das
duas novas desta feature:

1. `202608220000_stores.sql`
2. `202608220001_store_memberships.sql`
3. `202608240000_assets.sql`
4. `202608240001_products.sql`

Validar RLS a partir de um banco vazio: nenhuma leitura/escrita em
`assets`/`products` sem sessão autenticada associada à loja proprietária.

## Application checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test              # regras de domínio: unicidade de SKU, estados, validação de upload
pnpm build
pnpm test:e2e          # os cinco user stories + isolamento cross-tenant, desktop e mobile
```

## Manual validation script

1. Entrar como administrador A (loja A).
2. Cadastrar um produto com nome, descrição, imagem JPEG e quantidade;
   confirmar que aparece na lista com visibilidade/disponibilidade desligadas.
3. Repetir o cadastro com o mesmo SKU; confirmar rejeição com mensagem clara,
   sem duplicar o produto.
4. Editar o produto: trocar imagem (HEIC), ligar visibilidade, manter
   disponibilidade desligada; confirmar reflexo imediato e independência dos
   dois estados.
5. Desativar o produto; confirmar preservação do cadastro na lista
   administrativa e que `is_active=false` torna o produto inelegível para
   catálogo público/carrinho pela regra de `docs/data-model.md` §2.4 (o
   catálogo público em si não existe nesta feature — ver `data-model.md`
   "Fora do escopo").
6. Reativar o produto; confirmar que volta ativo com visibilidade e
   disponibilidade desligadas, exigindo nova configuração.
7. Acionar exclusão definitiva; cancelar uma vez (produto intacto), confirmar
   na segunda vez (produto removido de toda listagem).
8. Trocar para administrador B (loja B) e tentar acessar o `productId`
   cadastrado pelo administrador A diretamente pela URL; confirmar negação
   sem revelar dados do produto de outra loja.
9. Repetir o passo 2 com um arquivo acima de 10 MB e com um formato não
   aceito; confirmar rejeição com mensagem clara em ambos os casos.

## Evidence checklist (Stage 11)

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` limpos.
- [ ] `pnpm test` cobrindo unicidade de SKU, transições de estado e validação
      de upload por conteúdo real.
- [ ] `pnpm test:e2e` cobrindo os cinco user stories, isolamento cross-tenant
      e os quatro cenários de upload (aceito, HEIC, tamanho, formato).
- [ ] Verificação de acessibilidade (contraste, foco, teclado, movimento
      reduzido) no formulário e no diálogo de exclusão.
- [ ] Nenhum segredo, credencial ou identificador real de loja/produto em
      fixture, log ou commit.
