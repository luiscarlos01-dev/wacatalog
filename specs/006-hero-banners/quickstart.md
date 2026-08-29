# Quickstart — Banners do hero

Este guia valida a feature sem dados de produção nem credenciais commitadas.

## Prerequisites

- Node.js `24.19.0` e pnpm `11.22.0`.
- Loja e administradora de teste já provisionadas pelas features
  001-005 (administrador A/loja A, administrador B/loja B para o
  isolamento cross-tenant).
- Pelo menos duas imagens já enviadas via `/admin/assets` para a loja A
  (reusar o fluxo de upload já validado em produtos/import de PDF), pra
  poder criar e trocar a imagem de um banner sem depender de upload novo
  neste teste manual.

## Application checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test              # limite de 5, conflito de posição só entre ativos, reorder
pnpm build
pnpm test:e2e           # os quatro user stories, desktop e mobile
```

## Manual validation script

1. Entrar como administrador A (loja A), sem nenhum banner configurado
   ainda; confirmar que a lista aparece vazia.
2. Criar um banner (imagem, descrição acessível, posição 1, inativo);
   confirmar que aparece na lista.
3. Tentar criar um segundo banner ativo na mesma posição 1; confirmar
   rejeição clara (`position_conflict`), sem alterar o primeiro.
4. Criar banners até totalizar 5; tentar criar um 6º; confirmar rejeição
   clara (`banner_limit_reached`).
5. Editar um dos banners (trocar imagem, textos, marcar como ativo);
   confirmar que aparece no hero público da loja A.
6. Reordenar os 5 banners (ex.: trocar as posições 1 e 2, incluindo
   banners ativos); confirmar que a nova ordem é refletida sem erro —
   este é o caso que exercita a implementação em duas fases descrita em
   `research.md`.
7. Excluir um banner: acionar excluir, cancelar a confirmação (banner
   continua existindo), acionar de novo e confirmar (banner some da
   lista e do hero público).
8. Repetir como administrador B (loja B); confirmar que ele nunca vê,
   cria, edita, exclui nem reordena banners da loja A.
9. Repetir os passos principais em viewport mobile; confirmar contraste,
   foco visível, navegação por teclado e que a descrição acessível
   aparece de verdade como `alt` da imagem renderizada.

## Evidence checklist (Stage 11)

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`
      limpos.
- [ ] `pnpm test`: cobertura unitária do limite de 5, do conflito de
      posição restrito a banners ativos, e da reatribuição de posição no
      reorder.
- [ ] `pnpm test:e2e` cobrindo os quatro user stories, incluindo o caso
      de troca de posição entre dois banners ativos (passo 6 acima) e
      isolamento cross-tenant.
- [ ] Verificação de acessibilidade (contraste, teclado, `alt` real da
      imagem) em mobile.
- [ ] Teste direto contra o banco confirmando que `authenticated` sem
      vínculo de `store_admin` continua sem nenhum privilégio em
      `hero_banners` (mesmo padrão de verificação que pegou os achados
      A-1/A-2 na feature 005).
