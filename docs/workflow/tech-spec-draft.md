# Inventário técnico preliminar — Wacatalog

> **Substituído por:** [`tech-spec.md`](./tech-spec.md)

> **Status:** histórico; não usar como contrato técnico.
>
> Este arquivo inventaria apenas escolhas já registradas nas fontes internas do
> projeto. Não é uma aprovação arquitetural e não deve ser usado como contrato
> de implementação.

## Escopo e limites

O Wacatalog será uma aplicação de catálogo multi-tenant desde o início,
validada inicialmente com uma revendedora. A base técnica aprovada até este
momento é:

- aplicação full-stack em Next.js;
- hospedagem na Vercel;
- Supabase para Postgres, Storage e Auth;
- autenticação por email e senha, com contas provisionadas pelo mantenedor;
- modelo tenant-aware desde o começo, com registros e políticas associados à
  loja;
- sem cadastro público, OAuth, Cognito ou MFA no MVP.
- baseline de desenvolvimento com `pnpm`, ESLint e Prettier.

O inventário não cria entidades, endpoints, políticas detalhadas, componentes,
versões ou dependências. Essas decisões dependem da validação de produto e da
sequência canônica de documentação.

## Inventário por categoria

| Categoria | Escolha registrada | Limite atual |
| --- | --- | --- |
| Linguagens | TypeScript strict como default de um novo projeto, conforme o contrato de qualidade | Não há aplicação ou contrato de implementação; confirmar no planejamento técnico posterior |
| Framework | Next.js como aplicação full-stack | Versão, App Router/Pages Router e convenções ainda não decididos |
| Runtime | Runtime necessário para executar a aplicação Next.js | Runtime específico, segmentação server/client e requisitos de execução ainda pendentes |
| Plataforma | Vercel para hospedagem da aplicação | Projeto, ambientes, domínio, regiões e configuração de deploy ainda pendentes |
| Dados | Supabase Postgres | Entidades, migrações, índices, retenção e estratégia de acesso ainda pendentes |
| Autenticação | Supabase Auth com email e senha; contas criadas pelo mantenedor; sessão persistente em dispositivo confiável; recuperação em linguagem simples com suporte do mantenedor | Fluxos detalhados, duração/renovação de sessão e procedimentos operacionais serão formalizados no ADR de autenticação após o gate 03 |
| Autorização e tenancy | Modelo multi-tenant e tenant-aware desde o início; cada registro e política de acesso pertencente a uma loja deve ser escopado por ela | Papéis, claims, RLS, fronteiras server/client e regras detalhadas ainda pendentes |
| Storage | Supabase Storage | Buckets, convenções de nomes, políticas, transformações, limites e ciclo de vida ainda pendentes |
| UI | Interface da aplicação Next.js para catálogo e painel administrativo | Biblioteca de componentes, CSS, tokens, responsividade e decisões de UX ainda pendentes |
| Qualidade | TypeScript strict, ESLint para lint e Prettier para formatação | Versões, regras, scripts e integração no CI ainda pendentes |
| Testes | Testes unitários, integração e E2E proporcionais ao risco; QA de navegador para fluxos de UI | Frameworks, cobertura, ambientes e critérios executáveis serão definidos no planejamento |
| Segurança | Segredos não podem ser armazenados, registrados, commitados ou colados; credenciais administrativas devem permanecer server-only e fora do browser | Modelo completo de ameaças, headers, gestão de segredos e controles de CI ainda pendentes |
| Observabilidade | Necessidade de verificar comportamento e qualidade antes de declarar implementação concluída | Logs, métricas, tracing, alertas, retenção e ferramenta ainda não escolhidos |
| Ferramentas | `pnpm`, ESLint e Prettier; Context7, Browser/Playwright e Semgrep são preferências do contrato de qualidade quando disponíveis | Versões, scripts, CI, editor, dependências e integrações concretas ainda pendentes |

## Decisões pendentes

As alternativas abaixo são apenas pontos de decisão; não representam escolhas
feitas.

| Decisão | Alternativas curtas | Gate/artefato de decisão |
| --- | --- | --- |
| Linguagem e configuração do projeto | TypeScript strict; outra configuração somente se o contrato aprovado justificar | Planejamento técnico/feature e contrato de implementação após o gate 03 |
| Runtime e modelo de renderização | Server/client conforme necessidades do produto; detalhes do runtime Next.js | ADRs arquiteturais, após aprovação do produto |
| Versão e convenções do Next.js | Versão suportada definida no planejamento; App Router ou Pages Router | ADR ou plano técnico, após gate 03 |
| Gerenciador e scripts | `pnpm` está escolhido; scripts e política de execução ainda precisam ser definidos | Bootstrap/configuração do projeto e planejamento técnico |
| Persistência e acesso a dados | Supabase Postgres com estratégia de acesso server-side e/ou client-side controlado | ADR de dados, `docs/data-model.md` e contrato de feature |
| Autorização multi-tenant | RLS e políticas no banco; controles complementares na aplicação | ADR de tenancy/autorização e `docs/data-model.md` |
| Autenticação operacional | Fluxo Supabase Auth já aprovado; detalhes de sessão, recuperação e provisionamento | ADR de autenticação, após gate 03 |
| Organização do Storage | Buckets e políticas Supabase Storage definidos conforme os assets do catálogo | ADR/dados e `docs/data-model.md` |
| UI e acessibilidade | Componentes e styling a selecionar; requisitos de teclado, foco, contraste e movimento reduzido | PRD/feature spec, plano e gate 09 |
| Testes | Stack unitária, integração e E2E a escolher conforme a aplicação existir | Plano de implementação e gate 09 |
| Lint e formatação | ESLint e Prettier estão escolhidos; regras, integração e scripts ainda precisam ser definidos | Contrato de implementação e gate 09 |
| Nomenclatura e estrutura de pastas | Convenções de nomes, aliases e organização de diretórios ainda abertas | ADR/plano técnico após o gate 03 |
| Segurança e segredos | Gestão de segredos e controles de CI a definir sem expor credenciais | ADRs de segurança/deploy e gate 09 |
| Observabilidade | Logs, métricas, alertas e retenção a definir conforme riscos do MVP | ADR/plano técnico e critérios de aceitação |
| CI/CD e ambientes | Ambientes locais, preview e produção na Vercel; detalhes ainda abertos | ADR de deploy e planejamento de sprint |
| Versões de todas as ferramentas | Fixar somente quando dependências e ambiente forem escolhidos | Plano técnico; nenhuma versão é aprovada neste rascunho |

## Relação com a documentação canônica

Este arquivo não substitui ADRs, o PRD, o modelo de dados, o contrato OpenAPI,
os artefatos Spec Kit nem a Tech Spec definitiva. É um inventário de trabalho
para revelar lacunas antes da arquitetura; qualquer decisão estrutural precisa
ser registrada no ADR apropriado e passar pelo gate humano correspondente.

A ordem canônica permanece `ADR → gate → PRD → gate → data-model → gate →
OpenAPI → lint → gate → checker`. Nenhuma decisão pendente deste rascunho
autoriza arquitetura, implementação ou avanço além do gate 03.

## Fontes internas exatas

- `AGENTS.md` — invariantes do produto, fontes de verdade, contrato de
  qualidade e restrições de segurança.
- `docs/workflow/README.md` — etapas, gates humanos, estado atual e ordem
  canônica de documentação.
- `docs/workflow/checkpoint.md` — decisões de produto e caminho aprovado de
  autenticação até a retomada.
- `docs/workflow/quality-gates.md` — requisitos de qualidade, verificações
  futuras e tratamento de ferramentas indisponíveis.
- `.agents/skills/wacatalog-doc-workflow/SKILL.md` — sequência canônica,
  gates e regra de parada quando uma aprovação é necessária.

Não há, neste momento, aplicação, versões fixadas ou documento canônico
adicional no workspace que autorize escolhas mais específicas.
