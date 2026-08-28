# Feature Data Model — WhatsApp da loja

Esta feature não introduz nenhuma tabela, campo ou entidade nova. Reusa
integralmente `stores` (`docs/data-model.md` §2.1), já materializada
desde a feature 001.

## Campos reusados, sem alteração

| Campo | Regra já aprovada |
| --- | --- |
| `whatsapp_number` | Opcional; dígitos normalizados no padrão `55[0-9]{10,11}`. |
| `whatsapp_verification_status` | `unverified` (default) ou `verified`. |
| `whatsapp_verified_at` | Preenchido só quando `verified`. |

Regras de transição (já aprovadas, `docs/data-model.md` §2.1):

- Alterar `whatsapp_number` com sucesso sempre grava
  `whatsapp_verification_status = 'unverified'` e `whatsapp_verified_at =
  null`, mesmo se o número anterior já estivesse `verified`.
- Confirmar verificação grava `whatsapp_verification_status = 'verified'`
  e `whatsapp_verified_at = now()`. Exige `whatsapp_number` não nulo.

## Fora do escopo desta feature

- Qualquer consumo do status pelo catálogo público/carrinho (PRD §4.5) —
  a feature 003 já expõe `whatsappAvailable`/`whatsappNumber` em
  `PublicCatalog`, computados a partir destes mesmos campos; esta feature
  só garante que eles ficam corretos, não os consome.
- Qualquer campo ou tabela para histórico de números anteriores.
