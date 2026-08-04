# Platform Overview

## Product Vision

The AI Voice Receptionist platform enables businesses to deploy intelligent, configurable voice agents that answer calls, assist callers, execute workflows, and integrate with existing business systems — without rebuilding conversation infrastructure for each customer.

The platform is designed to be:

- **Provider-neutral** — Swap voice, AI, and telephony vendors through adapters.
- **Configuration-driven** — Customer branding, behavior, and integrations live outside the stable core.
- **Deployment-flexible** — Support public demos, multi-tenant cloud, isolated customer instances, and customer-managed VPS deployments.
- **Progressive** — Start as a modular monolith; evolve toward multi-tenant operation without premature microservice complexity.

## Platform Users

| User | Role | Primary goals |
|------|------|---------------|
| **Business owner** | Owns the tenant configuration and business outcomes | Reduce missed calls, improve caller experience, capture leads, book appointments |
| **Operator** | Day-to-day staff reviewing calls and follow-ups | Monitor sessions, read summaries, act on escalations |
| **Agent administrator** | Configures prompts, workflows, integrations, and modules | Tune agent behavior, enable features, manage routing rules |
| **Caller** | End customer interacting via phone or browser voice | Get answers quickly, complete tasks (book, qualify, support), reach a human when needed |

## Major Platform Capabilities

### Conversation and voice

- Real-time voice interaction over telephony or browser
- Speech-to-text and text-to-speech through pluggable voice adapters
- LLM-powered dialogue through pluggable AI adapters
- Tool and workflow execution during conversations

### Business modules (optional, per tenant)

- Receptionist — greeting, routing, FAQ handling
- Appointments — scheduling and confirmation flows
- Support — issue triage and escalation
- Leads — capture and qualification scoring
- Follow-up — post-call notifications and task creation

### Operations

- Session persistence and transcript storage
- Call summaries and outcome tracking
- Administrative dashboard for review and filtering
- Analytics and operational reporting
- Notification delivery (email, SMS, webhooks — via adapters)

### Configuration and deployment

- Tenant YAML/JSON configuration with schema validation
- Workflow definitions for multi-step business processes
- Integration definitions for CRM, calendar, and notification systems
- Deployment profiles for demo, cloud, isolated, and VPS models

## Architectural Layers

The platform separates four concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure                           │
│  (hosting, networking, TLS, observability, secrets store)   │
├─────────────────────────────────────────────────────────────┤
│                    Integrations                             │
│  (CRM, calendar, email, SMS, webhooks — per tenant)         │
├─────────────────────────────────────────────────────────────┤
│              Customer Configuration                         │
│  (tenant identity, prompts, hours, routing, modules)      │
├─────────────────────────────────────────────────────────────┤
│                    Platform Core                            │
│  (runtime, adapters, modules, persistence, dashboard)     │
└─────────────────────────────────────────────────────────────┘
```

### Platform core

The stable, reusable engine: conversation runtime, adapter interfaces, module registry, persistence layer, analytics hooks, and dashboard API. The core never embeds customer-specific branding or business rules.

### Customer configuration

Per-tenant files defining identity, prompts, business hours, routing, enabled modules, knowledge sources, and deployment settings. Loaded at startup or from a configuration service.

### Integrations

External system connectors (calendar, CRM, notifications) defined in configuration and invoked by workflows or modules. Implemented as integration adapters, not hardcoded in core.

### Infrastructure

Hosting environment, secret management, database, reverse proxy, and observability stack. Varies by deployment model (see [DEPLOYMENT-MODELS.md](DEPLOYMENT-MODELS.md)).

## Design Constraints

- No proprietary production code or customer data in this public repository.
- All examples use fictional businesses and placeholder credentials.
- Vendor selection is documented as options, not fixed dependencies.
- Initial implementation targets a modular monolith before any service split.

## Related Documents

- [Target Architecture](TARGET-ARCHITECTURE.md)
- [Call Flow](CALL-FLOW.md)
- [Tenant Configuration](TENANT-CONFIGURATION.md)
- [Deployment Models](DEPLOYMENT-MODELS.md)
