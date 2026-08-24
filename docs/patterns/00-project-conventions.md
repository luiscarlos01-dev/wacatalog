---
title: Convenções gerais do projeto
scope: Código, documentação técnica e comandos do Wacatalog
status: established
applies_to: "todos os arquivos de implementação"
source_of_truth: "AGENTS.md; docs/workflow/README.md"
last_reviewed: 2026-08-22
version_baseline: "N/A"
documentation_snapshot: "N/A — regras do repositório"
related_patterns: [typescript, security, quality]
---

# Convenções gerais do projeto

## Contract summary

Este é o primeiro pattern a consultar. Ele reúne convenções transversais; não
substitui contratos de produto, ADRs ou especificações de feature.

## Non-negotiable rules

### MUST

- Escrever código em inglês e manter textos visíveis ao usuário em PT-BR claro.
- Usar `camelCase` para variáveis e funções e `PascalCase` para componentes,
  classes e tipos.
- Preferir `const`; usar `let` apenas quando houver reatribuição real.
- Usar imports absolutos com alias quando o projeto os configurar.
- Respeitar o gerenciador e o formatter existentes.
- Manter cada registro e política tenant-owned escopado à loja.
- Respeitar os gates do workflow; código de produto só após a etapa 09.

### MUST NOT

- Criar preços no MVP.
- Criar cadastro público, OAuth, Cognito ou MFA no MVP.
- Expor senhas, tokens, chaves privadas ou `service_role`.
- Criar abstrações genéricas para um único uso sem necessidade concreta.
- Alterar contrato aprovado para fazer o código passar.
- Criar commit, push, deploy ou mutação de serviço externo sem autorização.

### SHOULD

- Preferir a solução mais simples que resolva o caso real.
- Favorecer legibilidade e composição consciente.
- Adicionar comentários somente para decisões não óbvias ou gotchas.

## Verification checklist

- [ ] Pattern aplicável e contrato upstream foram lidos.
- [ ] Typecheck, lint, testes e build foram executados quando disponíveis.
- [ ] Ferramentas indisponíveis foram reportadas explicitamente.

## Unknowns / not approved

- Estrutura final de pastas e aliases.
- Biblioteca de UI, CSS, estado, testes e observabilidade.

## Sources

- `AGENTS.md`
- `docs/workflow/README.md`

## Change log

- `2026-08-22` — criado a partir do contrato atual do projeto.
