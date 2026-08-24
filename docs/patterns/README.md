# Padrões de implementação do Wacatalog

## Propósito

Esta pasta contém instruções operacionais para criar, editar, revisar e
validar código do Wacatalog. Os arquivos são escritos para leitura humana e
extração direta por LLMs.

Os padrões não aprovam decisões que ainda estão pendentes no planejamento. Uma
lacuna marcada como `pending` deve voltar ao planejamento; não deve ser
preenchida por suposição durante a implementação.

## Regra de consulta obrigatória e sob demanda

Os patterns são consultados sob demanda. A LLM não precisa carregar todos os
arquivos desta pasta em toda tarefa; deve abrir somente os documentos relevantes
ao arquivo, camada, tecnologia e risco da mudança.

Antes de alterar ou criar código, o agente deve:

1. Ler `AGENTS.md`.
2. Ler este índice para identificar os patterns aplicáveis.
3. Ler `versions.md` antes de consultar documentação técnica externa ou Context7.
4. Ler sob demanda cada pattern aplicável ao domínio da mudança.
5. Ler os documentos canônicos e o contrato da feature, quando existirem.
6. Extrair as regras `MUST`, `MUST NOT`, `SHOULD` e `PENDING`.
7. Implementar somente o que é compatível com as fontes de maior precedência.
8. Executar a checklist de verificação do pattern e registrar verificações não
   executadas.

### Seleção sob demanda

- Mudança em tipos ou módulos: `typescript.md`.
- Componente ou hook: `typescript.md`, `react.md` e
  `frontend-accessibility.md` quando houver UI.
- Rota, página ou código server/client: `nextjs.md`, `typescript.md` e
  `security.md`.
- Auth ou sessão: `supabase.md`, `supabase-auth.md`, `nextjs.md` e
  `security.md`.
- Banco, RLS ou query tenant-aware: `supabase.md`, `supabase-postgres.md`,
  `supabase-auth.md` e `security.md`.
- Upload ou imagem: `supabase.md`, `supabase-storage.md`,
  `frontend-accessibility.md` e `security.md`.
- Dependência ou script: `versions.md`, `pnpm.md` e o pattern da ferramenta.
- Qualquer entrega: `00-project-conventions.md` e `quality.md`.

Se a mudança atravessar mais de um domínio, consulte a união dos patterns
indicados. Em caso de dúvida sobre o domínio, consulte primeiro o pattern mais
abrangente e expanda a leitura conforme as dependências encontradas.

Se houver conflito, use esta precedência:

```text
AGENTS.md
  > ADR aprovado
  > PRD, modelo de dados e OpenAPI aprovados
  > contrato aprovado da feature
  > docs/patterns/
  > documentação genérica da tecnologia
```

Um pattern nunca autoriza ignorar um gate humano, alterar um contrato aprovado,
expor um segredo ou criar código de produto antes da aprovação da etapa 09.

## Inventário e status

`established` significa que a escolha já está registrada no projeto.
`constrained` significa que existem regras obrigatórias, mas a ferramenta ou
configuração completa ainda não foi decidida. `pending` significa que o arquivo
registra a lacuna para impedir invenção.

| Arquivo | Domínio | Status | Consultar quando |
| --- | --- | --- | --- |
| [`versions.md`](./versions.md) | matriz de versões | proposed | antes de consultar documentação técnica |
| [`00-project-conventions.md`](./00-project-conventions.md) | convenções gerais | established | qualquer mudança |
| [`typescript.md`](./typescript.md) | TypeScript | established | tipos, funções, módulos |
| [`react.md`](./react.md) | React | constrained | componentes e hooks |
| [`nextjs.md`](./nextjs.md) | Next.js | established / constrained | rotas, server/client, páginas e APIs |
| [`supabase.md`](./supabase.md) | integração Supabase | established | qualquer integração Supabase |
| [`supabase-auth.md`](./supabase-auth.md) | autenticação | established | login, sessão e recuperação |
| [`supabase-postgres.md`](./supabase-postgres.md) | Postgres e tenancy | established / constrained | dados, queries, RLS e migrações |
| [`supabase-storage.md`](./supabase-storage.md) | Storage e uploads | established / constrained | imagens e arquivos |
| [`vercel.md`](./vercel.md) | hospedagem e deploy | established / constrained | runtime, envs e deploy |
| [`pnpm.md`](./pnpm.md) | dependências e scripts | established | pacotes e comandos |
| [`eslint.md`](./eslint.md) | lint | established / constrained | regras e validação |
| [`prettier.md`](./prettier.md) | formatação | established / constrained | formatação |
| [`quality.md`](./quality.md) | testes e verificação | constrained | qualquer entrega de código |
| [`security.md`](./security.md) | segurança e segredos | established | qualquer código que lide com dados ou acesso |
| [`frontend-accessibility.md`](./frontend-accessibility.md) | UI, UX e acessibilidade | constrained | telas, componentes e fluxos de usuário |

Não há pattern aprovado para Tailwind, biblioteca de componentes, framework de
testes, ORM, cliente de estado ou ferramenta de observabilidade. Essas escolhas
continuam `pending` até serem registradas no planejamento apropriado.

As versões listadas em [`versions.md`](./versions.md) são um baseline técnico
proposto. Até a aprovação do gate correspondente, a LLM deve tratá-las como
`proposed`, não como autorização para instalar dependências ou alterar o
contrato do projeto.

## Protocolo curto para a LLM

```text
CONTEXT: qual arquivo, domínio e fluxo estão sendo alterados?
PATTERNS: quais arquivos desta pasta se aplicam?
MUST: quais regras não podem ser violadas?
MUST_NOT: quais abordagens são proibidas?
PENDING: existe uma decisão ausente que impede assumir uma solução?
CONTRACT: o código respeita ADR/PRD/data-model/OpenAPI/spec da feature?
VERIFY: quais checks foram executados e qual foi o resultado real?
```

## Manutenção

- Atualize o pattern quando uma decisão aprovada mudar.
- Não transforme uma preferência pessoal em regra sem registrar a fonte.
- Mantenha exemplos curtos e executáveis; exemplos incompletos devem ser
  marcados como pseudocódigo.
- Cada alteração deve atualizar `Last reviewed` e o changelog do arquivo.

## Fontes usadas no inventário

- `AGENTS.md`
- `docs/workflow/README.md`
- `docs/workflow/tech-spec.md`
- `docs/workflow/checkpoint.md`
- `docs/workflow/quality-gates.md`
- `docs/adrs/0001-autenticacao-com-supabase-auth.md`
