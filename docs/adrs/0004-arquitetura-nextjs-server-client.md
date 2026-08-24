# ADR-0004 — Arquitetura full-stack do Next.js

- **Status:** Aceito
- **Data:** 2026-08-22
- **Escopo:** aplicação web, fronteiras server/client e mutações do MVP

## Contexto

O Wacatalog será uma aplicação full-stack em Next.js na Vercel. O catálogo
público precisa carregar bem em dispositivos móveis, enquanto o painel exige
interação para formulários, upload, carrinho, confirmação e edição de dados.

As decisões anteriores exigem que credenciais privilegiadas e regras de
autorização permaneçam em fronteiras confiáveis. A aplicação também precisa
manter uma separação clara entre comportamento interativo no navegador e
operações que acessam Supabase.

## Decisão

1. O Wacatalog usará o App Router do Next.js.
2. Server Components serão o padrão para páginas, layouts e leitura de dados.
   Eles serão preferidos para catálogo público, carregamento inicial e telas
   que não exigem estado ou APIs do navegador.
3. Client Components serão usados somente quando necessários para estado local,
   eventos de interface, APIs do navegador ou interação contínua, como carrinho,
   seleção de quantidade, upload, diálogos de confirmação e preferência de
   movimento reduzido.
4. Acesso a dados, verificação de sessão, autorização e operações privilegiadas
   ocorrerão no servidor. Nenhuma chave secreta do Supabase ou regra de
   autorização será enviada como lógica confiável ao cliente.
5. Server Actions poderão atender mutações internas do painel, como criar,
   atualizar, desativar e excluir produtos ou banners, quando a operação for
   iniciada pela própria interface do Wacatalog.
6. Route Handlers serão usados para endpoints HTTP explicitamente expostos,
   integrações, webhooks e operações que precisem seguir o contrato OpenAPI.
   Server Actions e Route Handlers deverão reutilizar a mesma lógica de domínio
   e autorização, sem duplicar regras de negócio.
7. O envio do pedido para o WhatsApp continuará sendo uma ação iniciada no
   cliente com dados do carrinho e link `wa.me`; o MVP não criará um pedido
   persistido nem processará pagamento ou checkout.

## Consequências

### Positivas

- O JavaScript enviado ao cliente fica restrito às partes realmente interativas.
- O catálogo público pode aproveitar renderização e busca de dados no servidor.
- A fronteira server/client fica compatível com o isolamento multi-tenant e com
  o uso server-only das credenciais administrativas.
- A aplicação pode manter formulários simples no painel sem transformar toda a
  tela em Client Component.

### Negativas e riscos

- A equipe precisa distinguir cuidadosamente código executado no servidor de
  código enviado ao navegador.
- Server Actions não substituem RLS, validação de entrada ou autorização; um
  erro de implementação ainda pode causar mutação indevida.
- A existência de duas superfícies de mutação — Server Actions e Route
  Handlers — exige testes compartilhados de domínio e autorização.
- O carrinho não será um pedido persistido; recarregar ou trocar de dispositivo
  pode não preservar a seleção até que uma decisão específica de UX seja tomada.

## Regras derivadas para os documentos seguintes

- O PRD deve separar claramente páginas públicas, painel autenticado e
  interações de navegador.
- O contrato OpenAPI deve listar apenas endpoints que realmente precisam ser
  HTTP; ações internas do painel não devem ser duplicadas sem necessidade.
- O plano de implementação deve definir uma fronteira única para validação,
  autorização e operações de domínio compartilhadas.
- Testes devem cobrir renderização pública, proteção do painel, mutações por
  formulário, upload, carrinho e abertura do WhatsApp em mobile e desktop.

## Alternativas consideradas

- **Pages Router:** rejeitado para o novo projeto; o App Router oferece a
  separação server/client necessária e é o caminho atual do Next.js.
- **Toda a aplicação como Client Components:** rejeitado por aumentar o bundle,
  expor mais lógica no navegador e ampliar a superfície de segurança.
- **Somente Route Handlers para toda mutação:** possível, mas adiciona chamadas
  HTTP internas para formulários simples; Server Actions são adequadas para
  mutações internas do painel.
- **Somente Server Actions:** rejeitado porque integrações, webhooks e o
  contrato HTTP precisam de endpoints explícitos.

## Fontes

- `AGENTS.md` — Next.js full-stack, Vercel e fronteiras de segurança.
- `docs/workflow/checkpoint.md` — comportamento aprovado do MVP.
- `docs/workflow/stories-produto.md` — jornadas pública e administrativa.
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js — Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
