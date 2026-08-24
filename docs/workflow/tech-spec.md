# Tech Spec — Wacatalog MVP

> **Status:** Aceita
>
> **Aprovada pelo mantenedor:** 2026-08-22
>
> **Data da aprovação:** 2026-08-22
>
> Este documento transforma as decisões aprovadas nos ADRs, no PRD, no modelo
> de dados e no contrato OpenAPI em um contrato técnico executável. Ele não
> autoriza implementação antes do gate da etapa 09.

## 1. Objetivo e precedência

O Wacatalog será uma aplicação web full-stack multi-tenant para que a
revendedora mantenha um catálogo simples e que clientes consultem produtos,
montem uma seleção e encaminhem a solicitação para o WhatsApp da loja.

Este documento é posterior aos documentos canônicos. Em caso de conflito, a
precedência continua sendo:

```text
ADR → PRD → data-model → OpenAPI → Tech Spec → feature spec
```

A Tech Spec define implementação, tooling e operações. Ela não altera regras
de negócio aprovadas nem cria escopo de produto fora do PRD.

## 2. Stack aprovada para o bootstrap

As versões abaixo devem ser fixadas no `package.json`, no lockfile e, quando
aplicável, em `.nvmrc` ou configuração equivalente. Não usar `latest` nas
dependências do projeto.

| Camada | Escolha | Versão inicial | Decisão de uso |
| --- | --- | ---: | --- |
| Runtime | Node.js LTS | `24.19.0` | Runtime padrão local, CI e funções Node da Vercel |
| Package manager | pnpm | `11.22.0` | `packageManager` do projeto e `pnpm-lock.yaml` |
| Framework | Next.js | `16.3.2` | App Router e full-stack; Webpack fixado no bootstrap |
| Hosting | Vercel | plataforma gerenciada | Deploy local/preview/produção; Node `24.x` configurado no projeto |
| UI runtime | React | `19.2.8` | Server Components por padrão |
| UI DOM | React DOM | `19.2.8` | Renderização web |
| Linguagem | TypeScript | `6.0.3` | `strict: true`; confirmado pelo mantenedor |
| Styling | Tailwind CSS | `4.3.3` | Utilitários sobre tokens CSS próprios |
| Integração Tailwind | `@tailwindcss/postcss` | `4.3.3` | Pipeline PostCSS do Tailwind v4 |
| CSS pipeline | PostCSS | `8.5.23` | Processamento usado pelo framework e Tailwind |
| Backend platform | Supabase | plataforma gerenciada | Postgres, Auth e Storage; sem versão de servidor controlada pelo app |
| SDK Supabase | `@supabase/supabase-js` | `2.112.3` | Cliente isomórfico, usado por adaptadores server/client autorizados |
| SSR Supabase | `@supabase/ssr` | `0.12.4` | Cookies e clientes para Server Components/Actions/Route Handlers |
| Schema/migrations | Supabase CLI | `2.115.0` | Migrações SQL, tipos gerados e ambiente local quando necessário |
| Validação | Zod | `4.4.3` | Entrada de formulários, Actions, Route Handlers e configuração |
| Imagens | sharp | `0.35.3` | Normalização server-side; execução somente em runtime Node |
| Lint | ESLint | `9.39.5` | Configuração flat; compatível com os plugins do Next.js 16.3.2 |
| Integração Next lint | `eslint-config-next` | `16.3.2` | Regras do Next alinhadas ao framework |
| Integração Prettier/ESLint | `eslint-config-prettier` | `10.1.8` | Desliga regras de formatação conflitantes |
| Formatter | Prettier | `3.9.6` | Formatação determinística |
| Unit/integration runner | Vitest | `4.1.10` | Testes rápidos de domínio, validação e adaptadores |
| Component tests | `@testing-library/react` | `16.3.2` | Testes orientados ao comportamento |
| Browser E2E | `@playwright/test` | `1.62.1` | Fluxos críticos mobile e desktop |

Ferramentas de workflow não entram no bundle da aplicação, mas também ficam
definidas: GitHub Actions usará `actions/checkout@v6`,
`actions/setup-node@v6` e `pnpm/action-setup@v4`; o lint do contrato continuará
usando `@redocly/cli` via `pnpm dlx` com a versão registrada no comando do CI.
Semgrep permanece uma verificação opcional do harness, sem dependência de
runtime do produto e sem versão local aprovada enquanto o MCP/CLI não estiver
disponível.

### 2.1 Por que não usar TypeScript 7 agora

TypeScript `7.0.2` é a versão `latest` consultada, mas “mais recente” não é
sinônimo de “melhor escolha para o primeiro bootstrap”. A linha `6.0.3` será
fixada para reduzir a superfície de incompatibilidade com parser, ESLint,
Vitest e tipos de dependências. A migração para TypeScript 7 será uma mudança
explícita, com atualização coordenada e verificação completa.

**Decisão confirmada:** o mantenedor aprovou TypeScript `6.0.3` em
2026-08-22.

### 2.2 Dependências deliberadamente não adotadas

- Nenhum kit visual, como shadcn/ui, MUI ou Chakra; os componentes do MVP serão
  pequenos, próprios e acessíveis.
- Nenhum ORM; o acesso relacional será feito pelo Supabase SDK e SQL de
  migração, preservando RLS e a proximidade com o modelo aprovado.
- Nenhum serviço de pedidos, pagamentos, preços, checkout, OCR ou importação de
  PDF no MVP.
- Nenhum serviço externo de analytics, tracing ou monitoramento é necessário
  para o primeiro fluxo validado.

## 3. Estrutura e convenções de aplicação

O projeto usará o App Router do Next.js. O bootstrap fixa Webpack nos scripts de
desenvolvimento e build; Turbopack poderá ser reavaliado em atualização isolada
quando a compatibilidade do pipeline CSS estiver comprovada.

```text
src/
  app/              rotas, layouts, loading/error e Route Handlers
  components/       componentes reutilizáveis de interface
  features/         fluxos por domínio quando houver complexidade real
  lib/              clientes, validações, autorização e adaptadores
  types/            tipos compartilhados que não pertencem a um domínio
supabase/
  migrations/       alterações versionadas do banco
  seed.sql          dados locais não sensíveis, se necessários
e2e/                cenários Playwright
```

Regras:

- Alias absoluto `@/*` aponta para `src/*`.
- Server Components são o padrão.
- Client Components só serão usados para estado local, eventos, APIs do
  navegador ou interações que realmente exigem JavaScript no cliente.
- Server Actions serão usadas para mutações internas do painel.
- Route Handlers serão usados para endpoints HTTP do OpenAPI, integrações e
  upload/processamento de imagens.
- A autorização será verificada no servidor em toda mutação, mesmo quando a
  interface já tiver ocultado a ação.
- O catálogo público não exigirá login; apenas a área da revendedora será
  autenticada.
- A fronteira de sessão do Next.js usará o mecanismo de request boundary da
  versão adotada (`proxy.ts`), mas cada leitura/mutação protegida continuará
  fazendo autorização server-side.

## 4. Dados, tenancy e acesso ao Supabase

### 4.1 Clientes Supabase

Serão mantidos adaptadores separados para:

- cliente server com sessão/cookies para requisições autenticadas;
- cliente público para catálogo e assets publicados;
- cliente administrativo com `service_role`, exclusivamente em código server,
  para provisionamento de contas pelo mantenedor.

A chave pública pode ser usada no browser apenas quando a política RLS tornar a
  operação segura. A chave `service_role`, senhas, tokens e valores de ambiente
  privados nunca podem ser enviados ao browser, registrados ou incluídos no
  repositório.

### 4.2 Migrações

- Toda alteração de schema será um arquivo SQL versionado em
  `supabase/migrations/`.
- RLS será habilitado junto da tabela e as policies serão revisadas no mesmo
  change set.
- O banco é a fonte de verdade; não haverá estado paralelo em memória para
  produtos, banners, identidade da loja ou quantidade disponível.
- Tipos TypeScript do banco serão gerados pelo Supabase CLI depois das
  migrações aprovadas.
- Ambientes local/preview e produção usarão projetos Supabase separados.

### 4.3 Isolamento

`store_id` é obrigatório em todo registro pertencente a uma loja. Leitura,
criação, edição, desativação e remoção administrativas exigem membership da
loja. A leitura pública é uma exceção explícita apenas para produtos, banners e
assets publicados pelas regras do catálogo.

## 5. Imagens e upload

O upload será recebido em um Route Handler Node, validado com Zod e processado
com `sharp` antes de chegar ao Storage:

1. aceitar JPEG, PNG, WebP, HEIC e HEIF até 10 MB no arquivo original;
2. preservar orientação e transparência quando aplicável;
3. remover metadados EXIF para não carregar localização ou dados do celular;
4. normalizar para WebP;
5. gerar um caminho de Storage pelo servidor, nunca aceitar caminho arbitrário
   fornecido pelo cliente;
6. salvar o asset normalizado e associá-lo ao registro da loja;
7. remover o asset anterior somente depois que a substituição tiver sido salva;
8. retornar erro claro e não persistir nada quando a decodificação ou
   normalização falhar.

O Route Handler de imagem usará runtime Node, não Edge. O primeiro sprint que
  implementar upload deve validar no ambiente de preview da Vercel a leitura
  de HEIC/HEIF, a normalização, o limite de 10 MB e a remoção de EXIF. Essa é
  uma verificação de compatibilidade da escolha já definida, não uma decisão
  para adiar o suporte do produto.

## 6. Autenticação, sessão e autorização

- Supabase Auth com email e senha.
- Contas criadas pelo mantenedor; sem cadastro público, OAuth, Cognito ou MFA no
  MVP.
- Sessão persistente no dispositivo confiável da revendedora.
- Recuperação em linguagem simples, com assistência do mantenedor sem expor
  credenciais.
- Rotas do painel exigem usuário autenticado e membership da loja.
- A criação administrativa de usuário acontece somente no servidor.
- Falhas de autenticação e autorização não revelarão se outro tenant ou usuário
  existe.

## 7. Interface, acessibilidade e experiência

Tailwind CSS será usado como camada de composição, com tokens CSS próprios para
cor, tipografia, espaçamento, raio e foco. O visual não dependerá de um kit
externo.

O contrato mínimo de cada tela inclui:

- layout funcional em mobile e desktop;
- navegação completa por teclado;
- foco visível e ordem de foco previsível;
- labels e mensagens em PT-BR;
- nomes acessíveis para controles e imagens;
- contraste suficiente para texto, estados e foco;
- suporte a `prefers-reduced-motion`;
- confirmação clara para exclusões irreversíveis;
- estados de carregamento, vazio, erro e sucesso.

O cliente não verá preço porque preço está fora do MVP. O SKU será exibido
quando preenchido e omitido quando ausente.

## 8. WhatsApp

O número da loja será normalizado no servidor para dígitos no formato
`55 + DDD + número`. O MVP validará formato e exigirá que a revendedora abra o
link de teste e confirme a conta correta antes de habilitar o envio.

O envio será um link `https://wa.me/{numero}?text={mensagem}` criado no cliente
com a mensagem codificada. A plataforma não usará API oficial do WhatsApp,
automação de conta ou promessa de verificar programaticamente se o número tem
WhatsApp.

O carrinho será estado local do cliente. Não haverá persistência de pedido no
backend neste MVP.

## 9. Scripts obrigatórios

O `package.json` deverá expor pelo menos:

```text
dev             iniciar desenvolvimento
build           gerar build de produção
start           executar build de produção
typecheck       tsc --noEmit
lint            eslint .
format          prettier . --write
format:check    prettier . --check
test            vitest run
test:unit       vitest run
test:watch      vitest
test:e2e        playwright test
test:e2e:ui     playwright test --ui
db:types        gerar tipos do Supabase
```

O CI usará `pnpm install --frozen-lockfile` e executará `typecheck`, `lint`,
`format:check`, `test:unit`, build e os E2E aplicáveis ao change. Os browsers do
Playwright serão instalados explicitamente no job de E2E.

## 10. Ambientes e entrega

| Ambiente | Aplicação | Dados |
| --- | --- | --- |
| Local | Next.js em Node 24.19.0 | Supabase local ou projeto não produtivo |
| Preview | Vercel Preview | Projeto Supabase não produtivo |
| Produção | Vercel Production | Projeto Supabase de produção |

Variáveis públicas e privadas serão separadas. Somente valores explicitamente
seguros para o browser poderão usar prefixo público do Next.js. A promoção para
produção exige revisão e autorização do mantenedor.

O build de produção usará Node runtime nas rotas que acessam Supabase,
autenticação, uploads ou `sharp`. Edge runtime não será adotado como padrão.

## 11. Segurança e observabilidade mínima

- Nenhum segredo será commitado, exibido em erro ou escrito em log.
- Logs de aplicação serão mínimos e estruturados, sem email, telefone, token,
  senha, URL privada de Storage ou conteúdo de carrinho.
- Erros apresentados ao usuário terão mensagem segura; detalhes técnicos ficam
  apenas no ambiente de desenvolvimento ou em log sanitizado.
- O app aplicará headers básicos de segurança, incluindo
  `X-Content-Type-Options`, `Referrer-Policy` e proteção contra embedding não
  autorizado.
- Uploads serão limitados por tamanho, MIME permitido, associação à loja e
  autorização do usuário.
- O CI bloqueará lockfile inconsistente, type errors, lint errors, testes
  quebrados e build quebrado.
- Semgrep será executado quando o MCP/CLI estiver disponível; indisponibilidade
  será registrada como não executado, nunca como aprovado.

Não será introduzido Sentry, analytics ou outro SaaS de observabilidade no
primeiro bootstrap. A necessidade será reavaliada depois do primeiro uso real.

## 12. Verificação de compatibilidade no bootstrap

Antes da primeira feature, o bootstrap deve provar:

- `node --version` retorna `v24.19.0`;
- `pnpm --version` retorna `11.22.0`;
- Next inicia, faz build e executa com React 19;
- TypeScript strict passa sem erro;
- ESLint 9.39.5 e `eslint-config-next` 16.3.2 funcionam em flat config;
- Tailwind 4.3.3 compila uma tela mínima;
- cliente server e cliente browser do Supabase não vazam segredo;
- Vitest executa um teste de domínio;
- Playwright executa um smoke test em Chromium;
- `sharp` normaliza pelo menos JPEG e HEIC/HEIF em preview;
- Redocly continua validando `docs/api/openapi.yaml`.

Se uma combinação falhar, a correção deve ser feita nesta Tech Spec antes da
criação da primeira feature. Não se deve alterar o contrato da feature para
acomodar uma incompatibilidade de tooling sem registrar a decisão.

## 13. Gate concluído

O mantenedor aprovou esta Tech Spec, confirmando especialmente:

1. Node 24.19.0 + pnpm 11.22.0;
2. Next 16.3.2 + React 19.2.8 + App Router;
3. TypeScript 6.0.3 em vez do TypeScript 7 mais recente;
4. Tailwind 4.3.3 sem kit visual externo;
5. Supabase SDK/SSR e CLI nas versões listadas;
6. `sharp` em runtime Node para normalização de imagens;
7. Vitest + Testing Library + Playwright;
8. ausência de preços, pedidos persistidos, pagamentos, OCR e PDF no MVP;
9. fluxo de feature só depois deste gate e do gate da etapa 09.

Com esta aprovação, este documento será a referência técnica para o bootstrap e
para a primeira especificação Spec Kit. Mudanças posteriores deverão ser
registradas como alteração desta Tech Spec ou em ADR quando forem estruturais.

## Fontes consultadas

- [Node.js Releases](https://nodejs.org/en/about/previous-releases)
- [Next.js no npm](https://www.npmjs.com/package/next)
- [React no npm](https://www.npmjs.com/package/react)
- [TypeScript no npm](https://www.npmjs.com/package/typescript)
- [Tailwind CSS no npm](https://www.npmjs.com/package/tailwindcss)
- [Supabase JS no npm](https://www.npmjs.com/package/@supabase/supabase-js)
- [Supabase CLI releases](https://github.com/supabase/cli/releases)
- [Zod no npm](https://www.npmjs.com/package/zod)
- [Vitest no npm](https://www.npmjs.com/package/vitest)
- [Playwright no npm](https://www.npmjs.com/package/@playwright/test)
- [Prettier — instalação](https://prettier.io/docs/install.html)
