# AI Voice Receptionist

A **public, sanitized reference implementation** and reusable boilerplate for building AI-powered voice receptionist platforms.

## Project Status

**Phase 1 complete (2026-08-03) — text-based conversation simulator.**

The repository now includes a working Next.js modular monolith with a provider-neutral conversation core, mock AI provider, in-memory persistence, API endpoint, and browser text demo. The composition root (`src/lib/conversation-service.ts`) currently wires `MockAIProvider` directly. An `AIProvider` interface enables future substitution, but environment- or tenant-config provider selection is not implemented yet. Voice and telephony adapters remain Phase 2+ placeholders. Database, authentication, and external AI integrations remain deferred.

## Quick Start (Phase 1)

```bash
npm install
npm run dev
```

Open:

- Home: [http://localhost:3000](http://localhost:3000)
- Text simulation demo: [http://localhost:3000/demo](http://localhost:3000/demo)

Other commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

No `.env` file is required for Phase 1. The `/demo` page uses the fictional dental clinic tenant only and makes no external network calls. A second fictional tenant is loadable via the API; tenant selection in the demo UI is a possible later enhancement.

## Purpose

This project serves three goals:

1. **Public demonstration** — A safe, fictional showcase of an AI Voice Receptionist platform for clients, recruiters, and the open-source community.
2. **Reusable boilerplate** — A clean starting point for future customer deployments without copying proprietary production systems.
3. **Architecture showcase** — Documentation and structure that explain how a modular voice-agent platform is designed, configured, and deployed.

## Phase 1 Capabilities

- Load fictional tenant configuration from YAML (`examples/tenants/`)
- Create and continue in-memory conversation sessions
- Deterministic mock AI responses (greeting, appointment intent, emergency routing, fallback)
- Mock tool execution: `check_availability` (fictional demo slots only — no booking)
- `POST /api/conversations/messages` API with validation and safe errors
- Browser text simulator at `/demo` (fictional dental tenant only)
- Provider-neutral `AIProvider` interface; `MockAIProvider` wired by the composition root

## What This Repository Does NOT Contain

- Production customer data, transcripts, or recordings
- Real API keys, tokens, phone numbers, or credentials
- Proprietary production source code from any private system
- Live voice, telephony, database, or external AI integration (yet)

All examples use **fictional companies and fictional customer data**.

## Planned Use Cases

| Use case | Description |
|----------|-------------|
| [Receptionist](docs/use-cases/RECEPTIONIST.md) | Answer calls, greet callers, route inquiries |
| [Appointment booking](docs/use-cases/APPOINTMENT-BOOKING.md) | Schedule, reschedule, and confirm appointments |
| [Customer support](docs/use-cases/CUSTOMER-SUPPORT.md) | Resolve common questions and escalate when needed |
| [Lead qualification](docs/use-cases/LEAD-QUALIFICATION.md) | Capture and score inbound leads |
| [Sales follow-up](docs/use-cases/SALES-FOLLOW-UP.md) | Trigger post-call workflows and notifications |

## High-Level Architecture

The platform follows a **modular monolith** design:

```
Caller → Telephony/Browser Voice → Voice Adapter → Conversation Runtime
       → AI Adapter → Tools/Workflows → Persistence → Dashboard & Analytics
```

Phase 1 implements the text-only subset documented in [Call Flow](docs/architecture/CALL-FLOW.md).

Key principles:

- **Stable core** — Conversation runtime and orchestration live in `src/core` and remain independent of customer branding.
- **Replaceable adapters** — Voice, AI, telephony, and notification providers are swappable behind adapter interfaces.
- **Externalized configuration** — Branding, prompts, business hours, routing, modules, and integrations live in tenant configuration, not in core code.
- **Industry behavior as modules** — Receptionist, appointments, support, leads, and follow-up are optional modules enabled per tenant.

See [Platform Overview](docs/architecture/PLATFORM-OVERVIEW.md) and [Target Architecture](docs/architecture/TARGET-ARCHITECTURE.md) for full details.

## Repository Layout

```
.
├── docs/           Architecture, security, use cases, roadmap
├── examples/       Fictional tenants, prompts, workflows, integrations, knowledge
├── schemas/        JSON Schema drafts (v0.1) for configuration
└── src/            Next.js app + conversation core + adapters + persistence
```

## Security

Before contributing or deploying, read:

- [Public Repository Policy](docs/security/PUBLIC-REPOSITORY-POLICY.md)
- [Secrets and Data Protection](docs/security/SECRETS-AND-DATA-PROTECTION.md)

## License

MIT — see [LICENSE](LICENSE).
