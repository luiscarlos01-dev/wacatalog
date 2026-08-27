# Instruções do projeto Wacatalog

## Fase atual

O Wacatalog segue o workflow de produto V2 definido em
`docs/workflow/README.md`. Planejamento e implementação acontecem em sessões
separadas. Não escreva código de produto antes de o gate humano da etapa 09
aprovar o contrato do sprint.

## Invariantes do produto

- Construir um catálogo multi-tenant mesmo durante a validação com a primeira
  revendedora.
- Usar Next.js como aplicação full-stack hospedada na Vercel.
- Usar Supabase para Postgres, Storage e Auth.
- A autenticação usa email e senha, com contas provisionadas pelo mantenedor.
  Não haverá cadastro self-service, comparação com Cognito, OAuth ou MFA no MVP.
- Manter a revendedora autenticada em seu dispositivo confiável. A recuperação
  deve usar linguagem simples e permitir assistência do mantenedor sem expor
  credenciais.
- Nunca armazenar, registrar, commitar ou colar senhas, tokens, chaves privadas
  ou credenciais de service role. Antes de rodar qualquer comando que leia ou
  faça dump de conteúdo que pode carregar segredo (`.env*`, trace de rede,
  cookies, headers, JWT), carregar a skill `wacatalog-safe-redaction` —
  redigir por allowlist (nomear o que é seguro mostrar), nunca por denylist
  (nomear o que é proibido), pois denylist falha silenciosamente pra qualquer
  campo não previsto. Achado real (2026-08-27): um `sed` cobrindo só
  `KEY`/`SECRET` deixou passar `PASSWORD`/`EMAIL` de um `.env`, e um dump de
  trace de rede vazou um JWT de sessão inteiro via `cookies` sem filtro.
- O modelo de dados e autorização é tenant-aware desde o início. Todo registro
  tenant-owned e toda policy de acesso devem ser escopados à sua loja.
- Os produtos possuem controles separados de visibilidade e disponibilidade.
- Preços de produtos estão fora do escopo do MVP.
- O hero suporta no máximo cinco banners ordenados, com imagem, descrição
  acessível, título/texto opcional e estado ativo. Links de CTA e agendamento
  estão fora do escopo.
- A identidade da loja é mantida pelo mantenedor do projeto, não pelas
  administradoras das lojas, no MVP.

## Fontes de verdade

Os documentos canônicos aprovados são:

1. `docs/adrs/*.md` para decisões arquiteturais. Um ADR mais novo só substitui
   outra fonte quando declarar isso explicitamente.
2. `docs/prd/wacatalog-mvp.md` para escopo e comportamento do produto.
3. `docs/data-model.md` para entidades, campos, relações e constraints.
4. `docs/api/openapi.yaml` para o contrato HTTP derivado do modelo de dados.

Os artefatos de feature em `specs/` são contratos de trabalho, não documentação
canônica do produto. Quando uma feature concluída alterar entidades ou APIs,
consolide o delta aprovado em `docs/`, na ordem canônica.

Dentro de uma feature, o conjunto aprovado de `spec.md`, `plan.md`, `tasks.md`,
`data-model.md`, `contracts/` e constituição forma o contrato de implementação.
Implementadores não podem alterar esse contrato para fazer o código passar;
podem apenas marcar checkboxes de tarefas concluídas. Ambiguidades retornam ao
planejamento.

## Gates do workflow

- Etapa 03: o mantenedor aprova o enquadramento do produto antes da arquitetura.
- Documentos canônicos: cada alteração em ADR, PRD, modelo de dados e OpenAPI
  possui seu próprio gate humano antes da escrita do documento seguinte.
- Etapa 09: o mantenedor aprova o escopo do sprint antes do código de produto.
- Etapa 11: um evaluator propõe um veredito; somente o mantenedor o ratifica.
- Implementação e revisão do contrato ocorrem sequencialmente. O reviewer é
  read-only e não corrige seus próprios achados.

## Agents de implementação e code review

- O agent `implementer` executa somente a tarefa delimitada autorizada após o
  gate da etapa 09. Seu objetivo vem do contrato aprovado da feature, não de
  uma interpretação informal do título da tarefa.
- O contrato da feature é o conjunto aprovado de `spec.md`, `plan.md`,
  `tasks.md`, `data-model.md`, `contracts/` e artefatos da constituição. Este
  repositório não usa atualmente um `contract.md` independente; se ele for
  introduzido, deverá ser incorporado ao conjunto aprovado antes da
  implementação.
- Antes de editar, o implementer lê o `AGENTS.md` mais próximo, os arquivos
  aplicáveis de `docs/patterns/`, os documentos canônicos e o contrato completo
  da feature. Ele implementa a menor mudança completa e adiciona os testes
  exigidos pela tarefa e pelo risco.
- O agent `contract-reviewer` realiza o code review após a implementação,
  usando o mesmo contrato, patterns, diff real e evidências de verificação. Ele
  é read-only, reporta primeiro os achados por severidade e devolve os achados
  bloqueadores ao implementer para correção.
- A sequência é estritamente `implementer → testes/evidências →
  contract-reviewer → correção → nova revisão`. Nenhum agent pode alterar o
  contrato aprovado para fazer a implementação passar.
- Depois de cada commit, o `contract-reviewer` deve revisar o commit contra o
  contrato aprovado e os `docs/patterns/` aplicáveis. O push é proibido até que
  essa revisão retorne `PASS`.
- O hook `post-commit` dispara essa revisão automaticamente quando o harness
  Git estiver instalado. Se houver achados, o relatório deve ser devolvido ao
  `implementer`, que corrige o código e cria um novo commit; o commit anterior
  não deve ser amendado para esconder o resultado da revisão.
- O hook `pre-push` é a barreira final: ele bloqueia o push quando a revisão
  está ausente, pendente, bloqueada, associada a outro commit ou quando algum
  check obrigatório não passou.
- A revisão automática deve usar o mesmo objetivo do contrato, os mesmos
  patterns versionados e as evidências de testes unitários, E2E, lint, build e
  segurança. Um hook indisponível é falha do harness, não aprovação implícita.

## Contrato de qualidade

- Seguir o package manager e o formatter existentes; o novo scaffolding do
  projeto usa pnpm, TypeScript strict e a arquitetura mais simples adequada.
- Antes de criar ou editar código, consultar primeiro `docs/patterns/README.md`
  e `docs/patterns/versions.md`, e depois ler sob demanda os patterns aplicáveis.
  Não carregar todos os patterns por padrão. Usar a versão exata declarada ali
  ao consultar documentação externa ou o Context7. Se uma versão estiver
  `pending`, não inventar uma implementação específica de versão; devolver a
  decisão ao planejamento.
- Antes de declarar a implementação concluída, inspecionar o output real de
  tipos, lint, testes, análise de segurança e build de produção quando esses
  comandos existirem.
- Testes unitários são obrigatórios para regras de domínio, transformações,
  validações e outras lógicas determinísticas que possam ser isoladas. Testes
  E2E são obrigatórios para jornadas críticas e comportamento entre camadas,
  especialmente autenticação, isolamento de tenant, gestão de produtos,
  uploads e envio de pedidos, quando esses fluxos forem implementados.
- Testes unitários e E2E devem derivar seu objetivo e critérios de aceitação do
  contrato aprovado da feature. Eles se complementam: E2E não substitui a
  cobertura unitária, e testes unitários não substituem a cobertura do fluxo no
  browser.
- O projeto ainda não escolheu os frameworks finais de teste. Não inventar um
  framework nem marcar um comando de teste ausente como aprovado; registrar a
  indisponibilidade e devolver a escolha ao planejamento.
- Trabalho de UI exige validação no browser em larguras mobile e desktop,
  navegação por teclado, foco visível, contraste, movimento reduzido e textos
  claros em PT-BR.
- Preferir Context7 para documentação de frameworks, Browser ou Playwright
  para comportamento de UI e Semgrep para análise de segurança quando
  disponíveis.
- Reportar checks indisponíveis explicitamente. Nunca converter uma ferramenta
  ausente em resultado aprovado.
- Não commitar, fazer push, publicar deploy ou alterar serviços externos sem
  autorização explícita do mantenedor.

## Gate de Pull Request no GitHub Actions

- Toda PR aberta, reaberta, marcada como pronta para revisão ou sincronizada
  deve disparar o workflow de revisão do Claude Code.
- O Claude Code deve revisar o diff contra o contrato aprovado da feature e os
  `docs/patterns/` aplicáveis. O resultado precisa ser estruturado e o workflow
  deve falhar sem `PASS` explícito.
- PRs que alterem código devem passar por typecheck, lint, testes unitários,
  testes E2E e build de produção. Esses checks devem executar o código do head
  da PR sem secrets disponíveis.
- O workflow deve usar `pull_request_target` apenas para o reviewer, mantendo o
  branch base no workspace e o head da PR isolado em subdiretório. Código não
  confiável de PR não pode ser executado no mesmo job que possui secrets.
- Os checks da PR são complementares ao review local pós-commit; passar na PR
  não autoriza merge, commit, push ou deploy por si só.
- O repositório deve configurar `ANTHROPIC_API_KEY` como secret do GitHub, nunca
  em arquivo, variável pública ou log. Os checks `Claude Code review` e `PR
  quality` devem ser obrigatórios na proteção da branch antes do merge, junto
  da aprovação humana exigida pelo workflow.
- Nenhuma PR pode ser mergeada na branch `main` sem os dois gates independentes:
  `Claude Code review` com veredito `PASS` para o commit mais recente e
  aprovação explícita do mantenedor. Aprovação do bot não substitui a revisão
  humana, e aprovação humana não substitui o review do bot.
- A branch `main` deve bloquear push direto, exigir PR, exigir os checks
  obrigatórios, exigir aprovação do mantenedor para o commit mais recente e
  bloquear merge com conversa ou finding bloqueador pendente. Essas regras
  precisam ser configuradas na proteção da branch ou ruleset do GitHub; a
  configuração local não é enforcement suficiente.

## Manutenção do harness

- Manter as skills geradas `speckit-*` e a infraestrutura `.specify/` alinhadas
  à versão fixada do Spec Kit. Não editar arquivos gerados manualmente, salvo
  quando uma atualização aprovada ou correção de compatibilidade documentada
  exigir isso.
- Comportamentos específicos do projeto pertencem às skills `wacatalog-*`, aos
  agents customizados ou a este arquivo; não fazer fork de skills geradas para
  preferências locais.
- O hook de documentação é um lembrete, não uma fronteira de enforcement. Os
  gates humanos e a revisão read-only continuam sendo a autoridade.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
