---
title: Nome do padrão
scope: Domínio coberto pelo arquivo
status: established | constrained | proposed | pending
applies_to: "globs, camadas ou tipos de mudança"
source_of_truth: "documentos que autorizam as regras"
last_reviewed: YYYY-MM-DD
version_baseline: "versão exata ou N/A para plataforma"
documentation_snapshot: "Context7 library ID/version + data da consulta"
related_patterns: []
---

# Nome do padrão

## Contract summary

Uma frase dizendo o que este arquivo controla e o que ele não controla.

Declare a versão exata usada para consultar a documentação. Se a versão não
estiver fixada, use `N/A` e marque a decisão como `pending`; não use `latest`
como se fosse uma versão reprodutível.

## When this pattern applies

Liste os tipos de arquivo, fluxo ou mudança que exigem esta leitura.

## Non-negotiable rules

### MUST

- Regras obrigatórias e verificáveis.

### MUST NOT

- Abordagens proibidas, incluindo segredos, atalhos e decisões fora do escopo.

### SHOULD

- Preferências fortes que podem ser justificadamente excepcionadas.

## Decision rules

Use regras condicionais explícitas:

- **Se** condição, **então** ação.
- **Se** não houver decisão aprovada, **então** pare e marque como `pending`.

## Preferred implementation

Descreva a forma preferida, as fronteiras server/client e as convenções de
nomes. Não invente APIs, versões ou dependências não aprovadas.

## Examples

### Good

Exemplo mínimo e executável, quando houver uma escolha aprovada.

### Avoid

Exemplo curto do anti-pattern e o motivo da rejeição.

## Integration boundaries

Registre contratos com outros patterns, camadas, serviços e fontes canônicas.

## Security, accessibility and performance

Liste apenas impactos relevantes e verificáveis para este domínio.

## Verification checklist

- [ ] Typecheck ou equivalente executado.
- [ ] Lint e formatação executados.
- [ ] Testes relevantes executados.
- [ ] Build ou verificação de integração executada, quando aplicável.
- [ ] Checks indisponíveis registrados como não executados.

## Unknowns / not approved

Registre decisões ainda pendentes. A LLM não deve preenchê-las por inferência.

## Sources

- Caminho para documento local ou URL oficial.

## Change log

- `YYYY-MM-DD` — descrição curta da alteração.
