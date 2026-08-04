# Use Case: Lead Qualification

## Overview

Inbound callers interested in services are engaged, qualified through structured questions, scored, and routed to sales or CRM for follow-up.

## Actors

- **Caller** — Prospect or inbound lead
- **AI agent** — Leads module with qualification script
- **Sales team** — Receives qualified leads via CRM integration or dashboard

## Goals

- Capture lead contact and intent information
- Apply qualification criteria (budget, timeline, service need)
- Score and prioritize leads
- Minimize low-quality handoffs to sales

## Typical Conversation Flow

1. Caller inquires about services or pricing
2. Agent asks qualification questions (configurable per tenant)
3. Module scores lead based on responses
4. High-score leads: CRM integration or immediate sales notification
5. Lower-score leads: nurture workflow or email follow-up

## Enabled Modules

- `receptionist`
- `leads` (required)
- Optional: `follow-up` for nurture sequences

## Configuration Highlights

- `modules.leads.qualification_questions` — Structured Q&A script
- `modules.leads.scoring_rules` — Point-based or rule-based scoring
- `integrations` — CRM connector definition
- `routing` — Hot lead → sales queue

## Success Metrics

- Lead capture rate
- Qualification completion rate
- Sales accepted lead rate
- Time from call to CRM record

## Fictional Example

**Northstar Home Services (Fictional)** — Caller requests a quote for HVAC installation; agent captures home size (fictional), timeline, and budget range; lead scored and sent to fictional CRM.

See [examples/tenants/fictional-home-services.yaml](../../examples/tenants/fictional-home-services.yaml).
