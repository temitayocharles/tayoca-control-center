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
  -> Vercel Authentication
  -> /api/control (server-side)
  -> Tayoca Control Gateway
     -> n8n loopback API
     -> canonical Forgejo Tayoca repository
```

The Vercel deployment is intended to run as an authenticated preview. Production control access is fail-closed unless `ALLOW_PRODUCTION_CONTROL_CENTER=true` is deliberately configured.

### Do not configure browser n8n credentials

This fork intentionally does **not** support `VITE_N8N_API_KEY`, browser-stored API keys, or the upstream direct n8n proxy. Do not reintroduce those paths.

## Environment

```env
# Browser-safe operator link only
VITE_N8N_CONSOLE_URL=https://n8n.example.com

# Server-side only
TAYOCA_CONTROL_GATEWAY_URL=https://n8n.example.com/webhook/tayoca-control/v6
TAYOCA_CONTROL_GATEWAY_TOKEN=<server-only-secret>

# Recommended for the protected preview
ALLOW_PRODUCTION_CONTROL_CENTER=false
```

`TAYOCA_CONTROL_GATEWAY_TOKEN` must be stored as a Vercel sensitive environment variable. It must never be prefixed with `VITE_`.

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

## Deployment

Deploy the desired branch as a Vercel **preview/staging** deployment with Vercel Authentication enabled. Keep the server-side gateway values scoped to preview.

Do not enable production control access until a production authentication design is explicitly approved and tested.

## Source ownership

This repository began as a fork of n8n-ops. Tayoca-specific control-plane behavior is maintained here. Canonical Tayoca website content remains in the Forgejo `temitayocharles/tayoca` repository.
