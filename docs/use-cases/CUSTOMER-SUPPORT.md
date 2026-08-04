# Use Case: Customer Support

## Overview

Callers report issues, ask product or service questions, and receive troubleshooting guidance. Complex or unresolved issues escalate to a human support queue.

## Actors

- **Caller** — Existing customer needing assistance
- **AI agent** — Support module with tenant knowledge base
- **Support operator** — Human agent for escalated tickets

## Goals

- Resolve common issues without human intervention
- Capture issue details for ticket creation
- Escalate with full context when AI cannot resolve
- Maintain consistent support tone and policies

## Typical Conversation Flow

1. Caller describes issue or question
2. Agent searches tenant knowledge for relevant articles
3. Agent guides caller through troubleshooting steps
4. If unresolved: create support ticket via integration; offer callback
5. Escalation notification sent to operator queue

## Enabled Modules

- `receptionist`
- `support` (required)
- Optional: `follow-up` for ticket status updates

## Configuration Highlights

- `knowledge` — Troubleshooting guides, policy documents
- `escalation` — Sentiment and keyword triggers
- `integrations` — Ticketing system connector (e.g. fictional helpdesk)

## Success Metrics

- First-contact resolution rate
- Escalation rate
- Average resolution time
- Knowledge base hit rate

## Fictional Example

**Northstar Home Services (Fictional)** — Caller asks about warranty coverage for a fictional appliance repair; agent answers from knowledge base or creates a support ticket.

See [examples/tenants/fictional-home-services.yaml](../../examples/tenants/fictional-home-services.yaml).
