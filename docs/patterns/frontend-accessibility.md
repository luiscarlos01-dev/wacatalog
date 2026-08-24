---
title: Frontend, UX e acessibilidade
scope: UI pública, painel administrativo e comportamento responsivo
status: constrained
applies_to: "componentes, páginas, formulários, modais e fluxos de UI"
source_of_truth: "AGENTS.md; docs/workflow/quality-gates.md; docs/workflow/checkpoint.md"
last_reviewed: 2026-08-22
version_baseline: "React 19.2.8; Tailwind CSS 4.3.3; UI library: none"
documentation_snapshot: "N/A para biblioteca UI; regras do projeto em 2026-08-22"
related_patterns: [react, nextjs, quality, security]
---

# Frontend, UX e acessibilidade

## Contract summary

O frontend deve funcionar em mobile e desktop, com copy PT-BR clara e controles
acessíveis. O bootstrap usa Tailwind CSS 4.3.3 e não adota biblioteca externa de
componentes.

## Non-negotiable rules

### MUST

- Usar HTML semântico e controles nativos quando forem suficientes.
- Garantir navegação por teclado, foco visível e ordem de foco coerente.
- Manter contraste adequado e suporte a preferência de movimento reduzido.
- Exibir estados de carregamento, vazio, erro e sucesso relevantes.
- Escrever mensagens em PT-BR simples, especialmente em autenticação,
  confirmação de exclusão e recuperação.
- Tornar descrições de imagens e erros de formulário acessíveis.

### MUST NOT

- Comunicar erro apenas por cor.
- Remover outline/foco sem substituto visível.
- Usar modal sem foco gerenciado, escape e retorno ao disparador.
- Criar CTA ou comportamento fora do escopo aprovado.
- Colocar regras de autorização somente como esconder/mostrar no frontend.

### SHOULD

- Projetar mobile-first quando o fluxo for usado principalmente no celular.
- Preferir estados previsíveis e confirmação explícita para ações destrutivas.
- Testar com teclado e viewport real antes de concluir.

## Decision rules

- **Se** uma ação é destrutiva, **então** exiba consequência e alternativa de
  preservação quando o contrato do produto exigir.
- **Se** uma imagem é conteúdo do produto ou banner, **então** solicite ou
  derive descrição acessível conforme o modelo aprovado.
- **Se** uma solução exige biblioteca de UI/CSS não escolhida, **então** marque
  `pending` e não adicione a dependência por conveniência.

## Verification checklist

- [ ] Mobile e desktop.
- [ ] Teclado e foco visível.
- [ ] Contraste.
- [ ] Movimento reduzido.
- [ ] Semântica/tecnologia assistiva quando aplicável.
- [ ] Copy PT-BR revisada.
- [ ] Estados de loading, vazio, erro e sucesso.

## Unknowns / not approved

- Design system, tokens, biblioteca de componentes e CSS/Tailwind.
- Breakpoints, browser matrix e ferramenta automatizada de acessibilidade.

## Sources

- `AGENTS.md`
- `docs/workflow/quality-gates.md`
- `docs/workflow/checkpoint.md`

## Change log

- `2026-08-22` — criado para consolidar os gates de UI e acessibilidade.
