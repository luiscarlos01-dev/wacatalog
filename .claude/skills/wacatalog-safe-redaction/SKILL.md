---
name: wacatalog-safe-redaction
description: Redact secrets safely (allowlist, never denylist) before printing, logging, or dumping anything that may carry credentials — .env files, network/HTTP traces, cookies, headers, session tokens. Use before any command whose output could contain a secret.
---

# Wacatalog Safe Redaction

Load this before running any command that reads or dumps something that
might carry a secret: `.env*` files, Playwright/HTTP network traces, cookie
jars, request/response headers, JWTs, session storage.

## The rule

**Redact by allowlist, never by denylist.** Name the fields you know are
safe to show, and hide everything else by default. A denylist (naming the
patterns you think are dangerous) fails silently for anything you didn't
anticipate — and you cannot anticipate every secret-bearing field name.

This is not a style preference — it's the direct lesson from a real
incident (2026-08-27, `implementer` session, PR `product-image-preview`):
`cat .env | sed -E 's/(KEY|SECRET)=.*/\1=<redacted>/'` was run to debug an
e2e failure. The regex covered `KEY`/`SECRET` and missed `PASSWORD`/`EMAIL`
entirely — three test passwords and three test emails printed in clear text
into the tool result (which persists in the session's transcript file on
disk). A second incident in the same session dumped a Playwright network
trace via `json.dumps` including the full `request.cookies` array, leaking a
complete Supabase session JWT (access + refresh). Both were self-reported via
`SendFeedback` by the session that caused them.

## Patterns

**Inspecting `.env`/`.env.local`/etc.:** default to printing variable
*names* only, never values:

```bash
grep -oE '^[[:space:]]*[A-Z_]+=' .env | tr -d ' =' | sort -u
```

If you need to confirm a *specific* value exists and is non-empty (not what
it is), check its length or a truthy test, not the value itself. If a
maintainer explicitly needs a value surfaced (e.g. to paste into another
tool themselves), name that single variable explicitly — never blanket-dump
the file, redacted or not, because "redacted" only holds for fields you
thought to redact.

**Network traces, HAR dumps, request/response logging (Playwright, curl -v,
browser devtools exports):** never serialize `cookies`, `headers`, or
`Authorization` wholesale. If you need trace content for debugging, build an
explicit allowlist of the fields relevant to the bug (e.g. `status`, `url`,
`method`, timing) and project only those — never `json.dumps(full_object)`
or equivalent on anything that could carry a cookie jar, bearer token, or
session identifier. If cookies/headers themselves are the thing under
investigation, name the *specific* key you're checking (e.g. "does a
`sb-access-token` cookie exist") rather than dumping the full jar to inspect
it visually.

**When in doubt about what's safe:** the safe default is names/keys only,
never values. Escalate to asking the maintainer for the specific value you
need rather than dumping a superset "just in case."

## If a secret ends up in a tool result anyway

It's already in the session's transcript file on disk (outside the repo) —
apologizing and not repeating the value doesn't undo that. File it with
`SendFeedback` immediately (don't wait to be asked), and separately flag to
the maintainer/orchestrator that the exposed value should be rotated —
regenerating the credential invalidates every copy that leaked, regardless
of how many transcript files ended up holding it. Don't re-grep the old
transcript to "check" something without a real need — that duplicates the
exposure into whatever session does the checking.
