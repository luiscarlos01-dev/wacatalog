# Quickstart — WhatsApp da loja

Este guia valida a feature sem dados de produção nem credenciais commitadas.

## Prerequisites

- Node.js `24.19.0` e pnpm `11.22.0`.
- Loja e administradora de teste já provisionadas pelas features
  001-004 (administrador A/loja A, administrador B/loja B para o
  isolamento cross-tenant).
- Nenhuma credencial real de WhatsApp é necessária — o teste só abre um
  link `wa.me`, sem enviar mensagem real (o WhatsApp do dispositivo/
  navegador que abrir a página faz isso, fora do controle desta feature).

## Application checks

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test              # normalização, validação, reset de verificação
pnpm build
pnpm test:e2e           # os dois user stories, desktop e mobile
```

## Manual validation script

1. Entrar como administrador A (loja A), sem número de WhatsApp
   configurado ainda.
2. Tentar confirmar verificação sem número configurado; confirmar
   rejeição clara.
3. Configurar um número em formato familiar (ex.: `(11) 91234-5678`);
   confirmar que é salvo normalizado e o status mostra "não confirmado".
4. Acionar testar; confirmar que abre `wa.me` com o número normalizado,
   sem mensagem pré-preenchida.
5. Confirmar a verificação; confirmar que o status muda para "confirmado"
   com data/hora.
6. Alterar para um número diferente; confirmar que o status volta pra
   "não confirmado" automaticamente.
7. Repetir como administrador B (loja B); confirmar que ele nunca vê nem
   altera o WhatsApp da loja A.
8. Repetir os passos principais em viewport mobile; confirmar contraste,
   foco visível e navegação por teclado no formulário.

## Evidence checklist (Stage 11)

Evidência registrada em 2026-08-29 (sessão `implementer`), depois do
`db reset` local que fixou o e2e (commits `5a6913d`/`cd4b3aa`).

- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build` limpos (exit 0 nos três).
      `pnpm format:check` falha (`exit 1`), mas só em 3 arquivos
      pré-existentes de `specs/005-whatsapp-store-config/` (`data-model.md`,
      `research.md`, `spec.md`), já aceitos pelo `contract-reviewer` como
      achado L-2 (baixo, não bloqueante, recorrência conhecida do gate) —
      nenhum arquivo de código está fora do padrão.
- [x] `pnpm test`: 91/91 unit tests passando, incluindo
      `normalize-whatsapp-number.test.ts` (formatos aceitos/rejeitados) e
      a cobertura de reset de verificação ao alterar o número em
      `update-store-whatsapp.test.ts`/`confirm-store-whatsapp.test.ts`.
- [x] `pnpm test:e2e` cobrindo os dois user stories, o conflito de
      confirmar sem número, e isolamento cross-tenant: rodada isolada de
      `e2e/whatsapp-store-config.spec.ts` + `e2e/whatsapp-store-config.a11y.spec.ts`
      contra um `supabase db reset` fresco — **17 passed, 0 failed** (9
      skipped: instâncias mobile-chromium de testes restritos a
      desktop-chromium por corrida entre projetos contra a mesma loja
      compartilhada, ver `tasks.md` T024 e o commit `5a6913d`).
      Conhecido: `e2e/whatsapp-store-config.spec.ts:62` ("confirming
      verification without any number configured...") só passa na primeira
      rodada da suíte depois de um `db reset` — o contrato não tem fluxo
      pra limpar o número de volta a `null` (ver comentário no próprio
      spec), então qualquer teste anterior no arquivo que configure um
      número o deixa configurado pras rodadas seguintes. Não é a flake
      conhecida da issue #8 (essa é sobre corrida de senha entre arquivos
      sob `fullyParallel`); rastreado separadamente na
      [issue #21](https://github.com/luiscarlos01-dev/wacatalog/issues/21).
- [x] Verificação de acessibilidade no formulário, em mobile: suíte
      `e2e/whatsapp-store-config.a11y.spec.ts` cobrindo contraste WCAG 2.2
      AA, navegação por teclado com foco visível, viewport mobile (390×844)
      e `prefers-reduced-motion` — todos passando na rodada isolada acima.
- [x] Nenhum número real de WhatsApp em fixture, log ou commit: os únicos
      números usados nos testes e fixtures são sintéticos
      (`5511912345678`, `5521988887777`, `(31) 97777-6666`, `119123456`),
      no mesmo padrão já estabelecido no contrato aprovado antes desta
      rodada — conferido via `grep` nos diffs dos commits `5a6913d`/
      `cd4b3aa`. Não relacionado ao vazamento de credenciais de `.env`
      (email/senhas de admin, sem número de WhatsApp) já reportado
      separadamente via `SendFeedback` nesta sessão.
