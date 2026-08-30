# Tayoca Control Center

A private external management console for Tayoca site content and n8n operations.

## Purpose

Tayoca Control Center is designed for routine administration without requiring AI or exposing powerful infrastructure credentials to the browser.

It provides:

- Site Content CMS for canonical Tayoca public content
- Workflow Studio for n8n workflow create, read, update and delete
- Explicit publish and unpublish controls
- Safe Run support for simple published static webhook workflows
- Execution, schedule, webhook, monitoring and operational views inherited from n8n-ops
- Server-side gateway access to n8n and canonical Forgejo

## Security model

The browser never receives an n8n API key, Forgejo token, or gateway token.

```text
Browser
  -> Cloudflare Access (production)
  -> /api/control (server-side)
  -> Tayoca Control Gateway
     -> n8n loopback API
     -> canonical Forgejo Tayoca repository
```

Production control access is fail-closed. `/api/control` enforces the canonical production hostname and validates Cloudflare Access before privileged gateway operations are allowed.

### Do not configure browser n8n credentials

This fork intentionally does **not** support `VITE_N8N_API_KEY`, browser-stored API keys, or the upstream direct n8n proxy. Do not reintroduce those paths.

## Environment

```env
# Browser-safe operator link only
VITE_N8N_CONSOLE_URL=https://n8n.example.com

# Server-side only
TAYOCA_CONTROL_GATEWAY_URL=https://n8n.example.com/webhook/tayoca-control/v6
TAYOCA_CONTROL_GATEWAY_TOKEN=<server-only-secret>

# Production hardening
CONTROL_CENTER_CANONICAL_HOST=control.tayoca.com
CLOUDFLARE_ACCESS_AUD=<cloudflare-access-audience>
CLOUDFLARE_ACCESS_TEAM_DOMAIN=<team>.cloudflareaccess.com
ALLOW_PRODUCTION_CONTROL_CENTER=true
```

`TAYOCA_CONTROL_GATEWAY_TOKEN` must be stored as a Vercel sensitive environment variable. It must never be prefixed with `VITE_`.

Production must not be enabled unless the canonical-host gate and Cloudflare Access verification are configured and validated.

## Workflow Studio

Workflow Studio supports normal administrative operations:

- Create workflow drafts
- Read full workflow definitions
- Edit JSON/configuration
- Save with post-write read-back verification
- Publish/unpublish
- Delete
- Run a workflow when it has exactly one published, unauthenticated, static GET or POST webhook trigger

The installed n8n version does not expose a supported public manual-run endpoint. For that reason the Control Center does not fake manual execution. Its Run action resolves and invokes only safe production webhooks. Other trigger types return a clear unsupported response.

## Site Content CMS

The CMS writes through the gateway to the canonical Forgejo Tayoca repository.

Current safeguards:

- `public/` content only
- HTML, HTM, Markdown, text and JSON files only
- 2 MB write limit
- SHA-based optimistic concurrency for update/delete
- Create/read/update/delete support
- Canonical Forgejo commit history for every change

## Local development

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Local development still uses `/api/control`; it does not proxy directly to n8n.

## Build

```bash
npm run build
```

## Deployment and repository operations

The Vercel project is Git-linked to this GitHub repository. `main` is the production branch and successful merges to `main` are expected to create production deployments automatically.

The normal change path is:

1. Create a short-lived feature or fix branch from `main`.
2. Open a pull request to `main`.
3. Require the repository CI check **Lint, build, and browser smoke** to pass.
4. Merge the reviewed change into `main`.
5. Confirm Vercel created a deployment for the exact merged SHA and promoted `control.tayoca.com` only after the deployment reached `READY`.

Do not bypass the production security model to make deployment verification easier. Cloudflare Access, the canonical-host gate, and the server-side gateway credential boundary must remain intact.

GitHub is configured to delete merged head branches automatically so merged feature branches do not accumulate.

## Source ownership

This repository began as a fork of n8n-ops. Tayoca-specific control-plane behavior is maintained here. Canonical Tayoca website content remains in the Forgejo `temitayocharles/tayoca` repository.
