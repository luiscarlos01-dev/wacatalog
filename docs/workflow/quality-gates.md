# Gates de qualidade

## Bootstrap do harness

O bootstrap só está validado quando:

- `specify --version` confirma a versão fixada;
- as skills próprias e vendorizadas passam no `quick_validate.py`;
- as skills geradas permanecem íntegras e são descobertas pelo runtime do Codex;
- os arquivos TOML dos agentes são parseáveis;
- o hook passa em seus testes de fixture;
- o estado do Git mostra somente os artefatos esperados;
- nenhum segredo ou arquivo de ambiente está rastreável.

O Spec Kit v1.0.1 adiciona a chave `compatibility` ao frontmatter das skills
geradas. O `quick_validate.py` atual não reconhece essa chave, mas o Codex
0.149.0 descobriu as dez skills corretamente. Por isso, os arquivos gerados não
são alterados para satisfazer um validador mais restritivo e perder a integridade
registrada no manifesto do Spec Kit.

## Planejamento

- Cada artefato aponta para sua fonte a montante.
- Cada documento canônico recebe aprovação isolada.
- OpenAPI passa no Redocly antes do checker de consistência.
- O checker é read-only e não promove código ou `specs/` a fonte canônica.
- A Tech Spec recebe gate humano antes do primeiro bootstrap de aplicação e da
  primeira especificação de feature.
- A etapa 09 exige `spec.md`, `plan.md`, `tasks.md`, `data-model.md` e
  `contracts/` coerentes ou explicitamente não aplicáveis.

## Implementação futura

Os comandos exatos serão definidos quando o projeto Next.js existir. O gate
deve cobrir, com output inspecionado:

- TypeScript strict;
- lint e formatação do tooling adotado;
- testes unitários e de integração proporcionais ao risco;
- testes end-to-end dos fluxos críticos;
- build de produção;
- análise de segurança com Semgrep quando disponível;
- browser QA em viewport mobile e desktop;
- teclado, foco visível, contraste e preferência de movimento reduzido.

Uma verificação indisponível é registrada como não executada, nunca como
aprovada. Falhas de hook, ferramenta ou ambiente são problemas do harness e
devem ser registradas antes de continuar.

Dentro do `ai-jail`, o Semgrep CLI atual não consegue carregar o store X509
porque certificados `*.pem` são protegidos pelo jail. Não contorne a política:
prefira o MCP do Semgrep quando disponível ou peça ao mantenedor para executar o
scan em um terminal fora do jail.
