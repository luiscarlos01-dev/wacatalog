---
name: wacatalog-frontend
description: Apply Wacatalog-specific UX, accessibility, and responsive constraints when designing or implementing its public catalog or seller administration UI. Use alongside frontend-design for visual direction.
---

# Wacatalog Frontend

Use the official `frontend-design` skill for visual direction, then constrain
that direction with the rules below. Product contracts always win.

## Audience and interaction

- Design mobile-first for buyers and for a seller with limited digital
  familiarity; validate at 360 px and a desktop width.
- Use short, literal PT-BR labels and keep the same action name through button,
  loading, success, and error feedback.
- Make primary actions visually dominant without hiding safe exit or recovery.
- Use touch targets of at least 44 by 44 CSS pixels, visible keyboard focus,
  WCAG AA contrast, semantic controls, and reduced-motion behavior.
- Do not depend on hover, color alone, gestures without alternatives, or dense
  multi-column admin forms on mobile.

## Seller login

The MVP login has only email and password for a pre-provisioned account. There
is no public registration, provider chooser, Cognito, OAuth, or MFA. Provide a
password visibility control, plain errors, a clear recovery path, and persistent
sessions on trusted devices. Never expose whether an arbitrary email exists.

## Product-specific states

Represent product visibility and order availability as distinct controls with
unambiguous consequences. Do not display prices. Banner editing must make the
five-item limit, order, active state, and accessible description understandable
without relying on hidden gestures.

Browser-check loading, empty, error, success, destructive confirmation, and
long-content states before presenting UI as complete.
