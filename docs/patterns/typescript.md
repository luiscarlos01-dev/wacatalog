---
title: TypeScript
scope: Tipagem e módulos TypeScript
status: accepted
applies_to: "**/*.ts, **/*.tsx"
source_of_truth: "AGENTS.md; docs/workflow/tech-spec.md"
last_reviewed: 2026-08-22
version_baseline: "TypeScript 6.0.3"
documentation_snapshot: "pacote oficial TypeScript consultado em 2026-08-22"
related_patterns: [00-project-conventions, react, nextjs, quality]
---

# TypeScript

## Contract summary

TypeScript strict é o padrão do projeto. O baseline proposto é `6.0.3`; a
 versão está confirmada para o bootstrap; a instalação ainda depende da
 aprovação da Tech Spec completa.

## Non-negotiable rules

### MUST

- Manter `strict` habilitado.
- Preferir tipos específicos, generics ou `unknown` em vez de `any`.
- Usar `type` para unions e aliases simples; usar `interface` quando houver
  extensão ou declaração aberta.
- Deixar a inferência trabalhar quando a anotação for redundante.
- Tratar entrada externa como `unknown` até validá-la.

### MUST NOT

- Introduzir `any` sem justificativa local e explícita.
- Silenciar erros com casts amplos, `@ts-ignore` ou `@ts-expect-error` sem
  motivo verificável.
- Usar opções legadas sem verificar o comportamento do TypeScript 6.

### SHOULD

- Usar funções pequenas com entradas e saídas tipadas.
- Nomear tipos pelo domínio, não pela implementação.
- Evitar alvo ES5 e opções depreciadas sem necessidade; a documentação da
  versão 6 alerta que algumas deixarão de funcionar no TypeScript 7.

## Decision rules

- **Se** o dado vem de browser, API, banco ou usuário, **então** trate-o como
  `unknown` até validar.
- **Se** um cast parece necessário em uma fronteira externa, **então** valide a
  fronteira e prefira estreitar o tipo.
- **Se** o tipo do domínio ainda não existe no contrato, **então** não invente
  campos; retorne ao planejamento.

## Examples

```ts
type ProductVisibility = "visible" | "hidden";

type Product = {
  id: string;
  visibility: ProductVisibility;
};
```

## Verification checklist

- [ ] Typecheck executado com strict.
- [ ] Não há `any` novo sem justificativa.
- [ ] Entradas externas têm validação apropriada.
- [ ] Não foram introduzidas opções depreciadas da versão alvo.

## Unknowns / not approved

- Biblioteca de validação de schemas.
- Configuração final de aliases e geração de tipos.

## Sources

- `AGENTS.md`
- `docs/workflow/tech-spec.md`
- [TypeScript no npm](https://www.npmjs.com/package/typescript)

## Change log

- `2026-08-22` — baseline alinhado à Tech Spec e TypeScript strict 6.0.3.
