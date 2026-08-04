# Use Case: Sales Follow-Up

## Overview

After a voice interaction, automated workflows trigger follow-up actions: confirmation emails, callback scheduling, nurture sequences, or task creation for sales staff.

## Actors

- **Caller** — Prospect or customer from prior interaction
- **Workflow engine** — Executes post-session follow-up steps
- **Sales / operator** — Receives tasks and notifications

## Goals

- Ensure no lead or request falls through the cracks
- Automate routine follow-up communications
- Provide operators a actionable queue
- Track follow-up completion

## Typical Triggers

- Session ended with outcome `lead_captured`
- Session ended with outcome `appointment_requested`
- Session ended with outcome `escalated`
- Scheduled delay after incomplete booking

## Typical Workflow Steps

1. Persist session outcome and summary
2. Send notification (email/SMS) to caller with next steps
3. Create CRM task or internal follow-up record
4. Schedule reminder for operator if no response within N hours

## Enabled Modules

- `follow-up` (required)
- Often combined with: `leads`, `appointments`, `receptionist`

## Configuration Highlights

- `workflows` — Follow-up workflow definitions
- `default_workflows.on_session_end` — Trigger mapping by outcome
- `integrations` — CRM, email, SMS connectors
- `modules.follow-up` — Delay intervals, retry policy

## Success Metrics

- Follow-up task completion rate
- Time to first human outreach
- Conversion rate from follow-up to booked appointment
- Notification delivery success rate

## Fictional Example

After a fictional dental clinic call ends with `lead_captured`, a workflow sends a confirmation SMS and creates a task for the office manager to call back within 24 hours.

See [examples/workflows/appointment-booking.yaml](../../examples/workflows/appointment-booking.yaml) for workflow structure patterns.
