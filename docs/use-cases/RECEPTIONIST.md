# Use Case: Receptionist

## Overview

An AI receptionist answers inbound calls, greets callers by the business name, handles common inquiries, and routes or escalates when human assistance is required.

## Actors

- **Caller** — Customer or prospect calling the business
- **AI agent** — Voice receptionist configured with tenant branding
- **Operator** — Human staff receiving escalations or voicemail summaries

## Goals

- Answer every call during and outside business hours
- Provide consistent, branded caller experience
- Reduce routine questions handled by staff
- Route callers to the correct department or module

## Typical Conversation Flow

1. Greet caller with tenant-specific greeting
2. Identify caller intent (appointment, support, sales, general inquiry)
3. Answer FAQ from tenant knowledge sources
4. Route to enabled module (appointments, support, leads) or escalate to human
5. Summarize call and persist outcome

## Enabled Modules

- `receptionist` (required)
- Optional: `appointments`, `support`, `leads`

## Configuration Highlights

- `branding.greeting` — Opening script
- `knowledge` — FAQ and service catalog
- `routing` — Intent-to-destination map
- `business_hours` — After-hours behavior

## Success Metrics

- Call answer rate
- Intent classification accuracy
- Escalation rate
- Average handle time
- Caller satisfaction (post-call survey, when enabled)

## Fictional Example

**Bright Smile Dental (Fictional)** — Receptionist greets callers, answers questions about office hours and accepted insurance (fictional list), and offers to book appointments or take a message.

See [examples/tenants/fictional-dental-clinic.yaml](../../examples/tenants/fictional-dental-clinic.yaml).
