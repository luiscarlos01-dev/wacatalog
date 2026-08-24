# Checkpoint de planejamento

## Produto aprovado até aqui

- Nome: Wacatalog.
- Primeiro uso real: uma revendedora, com fundação multi-tenant desde o início.
- Aplicação full-stack em Next.js, hospedada na Vercel.
- Supabase para Postgres, Storage e Auth.
- Provisionamento manual de tenant e administradora; sem onboarding self-service.
- Catálogo inicial criado pelo painel administrativo; o projeto de referência é
  apenas referência de UX.
- A administradora terá CRUD de produtos no painel: visualizar, criar,
  atualizar, desativar e excluir, incluindo upload de imagem, edição de
  descrição, SKU e definição da quantidade disponível.
- No catálogo, o cliente poderá abrir um produto disponível e selecionar uma
  quantidade limitada pela quantidade informada pela revendedora.
- Após confirmar a quantidade, o produto ficará no carrinho. O cliente poderá
  adicionar outros produtos, revisar o carrinho e enviar o pedido para o
  WhatsApp da revendedora com uma mensagem pré-preenchida.
- A revendedora poderá configurar e alterar o número de WhatsApp usado para
  receber os pedidos da loja.
- O número será informado em formato familiar, normalizado e armazenado apenas
  como dígitos no padrão internacional brasileiro (`55` + DDD + número). O
  envio usará um link `wa.me` gerado automaticamente.
- A mensagem pré-preenchida seguirá o formato: saudação, identificação da
  loja, lista de produtos com SKU quando informado, nome e quantidade, total de
  unidades e pedido de confirmação da disponibilidade. Não conterá preços.
- Além da validação do formato, a revendedora deverá testar o número pelo
  WhatsApp e confirmar que a conta correta foi aberta antes que o envio de
  pedidos seja habilitado. Sem número válido e confirmado, o carrinho será
  preservado e o envio ficará indisponível.
- O cliente poderá esvaziar o carrinho, mas a remoção de todos os itens exigirá
  confirmação; cancelar a confirmação preservará a seleção.
- A exclusão de produto será definitiva; para voltar a usá-lo, a revendedora
  deverá cadastrá-lo novamente. Para preservar o cadastro sem manter o produto
  ativo, haverá uma opção de desativação. Ao reativar, ela deverá configurar
  novamente a visibilidade e a disponibilidade; os estados anteriores não
  serão restaurados automaticamente.
- Antes da exclusão, a confirmação exibirá: “Tem certeza de que deseja excluir
  definitivamente o produto ‘{nome}’? Essa ação não pode ser desfeita. Para
  apenas ocultá-lo e preservá-lo, use ‘Desativar’.” As ações serão “Cancelar” e
  “Excluir definitivamente”.
- Produtos sem preços no MVP; o SKU será opcional, editável pela revendedora e
  único dentro do catálogo/loja, servindo como identificador interno para
  facilitar o repasse do pedido à empresa que ela representa. Quando
  informado, também será exibido para a cliente no catálogo.
- Visibilidade no catálogo e disponibilidade para pedido são controles distintos.
- Identidade da loja mantida pelo mantenedor no MVP.
- Hero com até cinco banners ordenáveis, sem CTA e sem agendamento.
- A primeira validação considerará um catálogo de até 50 produtos; esse é um
  volume inicial de MVP, não um limite estrutural permanente da arquitetura.
- Importação de catálogo mensal por PDF é uma evolução futura, fora do MVP;
  será planejada separadamente antes de qualquer implementação.
- Imagens de produtos e banners aceitarão JPEG, PNG, WebP, HEIC e HEIF, com
  limite de 10 MB por arquivo e normalização automática para formato compatível
  com navegadores.
- Baseline de desenvolvimento definido: `pnpm` como gerenciador, ESLint para
  lint e Prettier para formatação.

## Acesso da revendedora

A comparação Supabase Auth versus Cognito e suas previews foi descartada em
2026-08-22. O caminho aprovado para o MVP é Supabase Auth com:

- email e senha;
- conta criada pelo mantenedor;
- tela sem cadastro público;
- sessão persistente no dispositivo confiável;
- recuperação em linguagem simples e suporte do mantenedor;
- sem OAuth, Cognito ou MFA no MVP.

A credencial inicial deve ser entregue fora do repositório e nunca aparecer em
logs, documentação ou conversas com agentes. A decisão foi formalizada no
ADR-0001.

O caminho é suportado diretamente pelo Supabase: login por senha, recuperação
por email, sessão persistente e criação administrativa de usuários. A criação
administrativa é server-only e a chave `service_role` nunca pode chegar ao
browser. Referências: [Auth JavaScript](https://supabase.com/docs/reference/javascript/auth),
[recuperação de senha](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
e [criação administrativa](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

## Ponto de retomada — 2026-08-22

O bootstrap, a documentação canônica e a Tech Spec foram concluídos e
aprovados. A primeira feature ativa é
`specs/001-admin-store-access/`, sobre acesso da administradora/revendedora e
isolamento da loja.

Artefatos concluídos da feature:

- `spec.md` com login, sessão persistente, logout, recuperação de senha e
  autorização multi-tenant;
- `plan.md`, `research.md`, `data-model.md`, `contracts/` e `quickstart.md`;
- `tasks.md` com 45 tarefas ordenadas;
- checklist de requisitos aprovado e artefatos formatados com Prettier.

Clarificação incorporada: somente a administradora/revendedora com conta
provisionada usa login, sessão e recuperação de senha. Clientes acessam o
catálogo público sem login, sessão ou recuperação.

O ciclo de recuperação inclui redefinição da senha por link válido para a
revendedora. O isolamento testa leitura cross-tenant e tentativas não
autorizadas de alterar membership ou recurso tenant-owned.

O contrato da feature foi alinhado com a sessão paralela de documentação antes
do início desta sessão de implementação.

## Evidências da implementação inicial — 2026-08-23

A fundação da feature foi implementada sem credenciais reais no repositório:

- clientes Supabase browser/server separados, refresh no `src/proxy.ts` e
  verificação server-side com `auth.getUser()`;
- migration e RLS de `store_memberships`, guard de membership e rota
  `GET /admin/store` com escopo derivado do usuário autenticado;
- telas PT-BR de login, logout, recuperação e redefinição segura de senha;
- testes unitários, cenários Playwright e verificação de secrets no bundle;
- Semgrep MCP `1.173.0`: nenhum finding nos arquivos alterados.

Evidências observadas:

- `pnpm typecheck`: passou;
- `pnpm lint`: passou;
- `pnpm format:check`: passou;
- `pnpm test:unit`: 7 arquivos, 13 testes passaram;
- `pnpm test:e2e`: 7 passaram e 3 foram pulados por ausência de contas
  Supabase não produtivas configuradas;
- `pnpm build`: passou com as rotas administrativas dinâmicas.

Ainda falta executar os cenários que dependem de duas contas, membership
provisionado e email de recuperação em um ambiente Supabase não produtivo.

## Retomada da correção documental — 2026-08-23

O projeto hospedado `wacatalog-dev` foi criado no Supabase. A integração com o
repositório `luiscarlos01-dev/wacatalog` está conectada com working directory
`.` e `Deploy to production` desligado. O remoto ainda contém somente o commit
inicial; o workspace local permanece sem commit e sem push.

Foi detectado um bloqueio no contrato da primeira feature: a migration atual
cria `public.store_memberships` com FK para `public.stores`, mas não existe
migration criando `public.stores`. Em um projeto Supabase novo, a migration não
pode ser aplicada nessa ordem.

O mantenedor autorizou uma correção exclusivamente documental da feature
`001-admin-store-access`. Na próxima sessão:

1. Atualizar `specs/001-admin-store-access/plan.md` para declarar `stores` como
   fundação canônica desta primeira feature e ordenar sua migration antes de
   `store_memberships`.
2. Atualizar `specs/001-admin-store-access/data-model.md` com os campos e
   constraints canônicos de `stores`, sem criar entidade nova ou divergir de
   `docs/data-model.md`.
3. Atualizar `specs/001-admin-store-access/tasks.md` com tarefas explícitas para
   criação de `stores`, grants de menor privilégio, RLS e testes de banco antes
   das tarefas de membership. Preservar os checkboxes existentes e marcar como
   pendente todo trabalho novo ou que precise ser refeito.
4. Atualizar `specs/001-admin-store-access/quickstart.md` para aplicar e validar
   as migrations em ordem num Supabase local ou não produtivo antes dos E2E
   dependentes de credenciais.
5. Formatar os quatro artefatos e executar `speckit-analyze` estritamente
   read-only. Reportar achados antes de qualquer nova implementação.

A correção deve explicitar que o projeto Supabase foi criado com exposição
automática de novas tabelas desligada: grants e policies RLS precisam estar nas
migrations. O acesso administrativo deve resolver a loja pela membership;
usuários autenticados não podem criar ou alterar `stores` ou memberships. O
provisionamento privilegiado continua server-only. A leitura pública da loja
deve permanecer separada e só ser ampliada quando o contrato do catálogo
público definir os campos e policies correspondentes.

Não alterar código de produto, migrations, testes ou checkboxes durante essa
sessão documental. Não aplicar migration, criar dados remotos, commitar ou
fazer push antes da correção, nova análise e novo gate humano da etapa 09.

## Remediação do contrato da etapa 09 — 2026-08-23

Uma análise read-only posterior encontrou divergência entre o estado real do
workspace, os checkboxes de verificação e o gate registrado. O mantenedor
autorizou corrigir somente os artefatos de planejamento antes de reapresentar a
feature ao gate 09.

As clarificações aprovadas definem:

- retorno de sessão no mesmo perfil de navegador enquanto ela permanecer
  válida, sem checkbox de confiança ou identificação adicional do dispositivo;
- mutação cross-tenant exercitada pela Data API com uma sessão comum e negada
  por grants/RLS, sem endpoint de produto e sem `service_role`;
- duas contas associadas às respectivas lojas e uma terceira conta confirmada
  sem membership para o cenário de acesso não autorizado;
- WCAG 2.2 AA com limites explícitos de contraste;
- validação moderada determinística de login e recuperação com a primeira
  administradora, sem registrar PII ou credenciais.

Um login manual local foi concluído depois que a chave pública do Supabase foi
configurada fora do repositório. Essa observação não conclui as jornadas E2E nem
os checks finais. T010 e T024 voltaram a pendentes até a reexecução com output
observado. Nenhum novo código de produto está autorizado antes da nova análise e
da aprovação humana explícita da etapa 09.

O mantenedor aprovou explicitamente o contrato remediado da feature
`001-admin-store-access` na etapa 09 em 2026-08-23. A retomada deve ocorrer em
outra sessão, com o papel `implementer`, começando por T010. Depois das mudanças
e evidências, uma sessão distinta com o papel `contract-reviewer` faz a revisão
read-only; achados retornam ao `implementer` para correção e nova revisão. A
sessão de documentação/orquestração apenas mantém contrato, gates, memória e
handoffs: ela não executa implementação nem revisão de código.

## Estado do bootstrap

- Spec Kit 1.0.1 instalado e inicializado com integração Codex.
- Skills próprias e `frontend-design` validadas.
- Dez skills geradas descobertas pelo runtime sem alterar seus checksums.
- Três agentes TOML parseados com sucesso.
- Hook de documentação aprovado por cinco testes de fixture.
- Scripts shell do Spec Kit passaram em validação sintática.
- Semgrep CLI indisponível dentro do `ai-jail` por bloqueio do store X509.
- A confiança do hook local é uma configuração do ambiente e não deve ser
  automatizada pelo repositório.
