# WiseFlow AI Assistant

Last updated: 2026-05-28

## What Was Added

- Global floating WiseFlow AI widget on authenticated pages.
- Secure server route: `/api/ai/assistant`.
- CSRF protection, authenticated server session enforcement, and persistent/shared rate limiting.
- Local workflow-help fallback when `OPENAI_API_KEY` is not configured.
- Optional OpenAI Responses API integration when `OPENAI_API_KEY` is configured.

## Environment

Add these server-side values in production if AI replies should use OpenAI:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
```

Do not add a `NEXT_PUBLIC_` prefix to the API key.

## Behavior

- The widget sends only recent chat messages plus lightweight page context: path, browser page title, company name, and role.
- It does not send full client, payroll, project, warehouse, or accounting datasets.
- The assistant is instructed to guide users through workflows, not claim that it created, deleted, approved, or sent records.
- Without an OpenAI key, the assistant still answers common WiseFlow workflow questions locally.

## QA

- `npm run check:flow-smoke` includes a deterministic AI assistant local-guidance test.
- Latest local run passed: `.data/automated-smoke/2026-05-27T17-57-08-815Z`.
