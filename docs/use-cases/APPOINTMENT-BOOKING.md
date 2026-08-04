# Use Case: Appointment Booking

## Overview

Callers schedule, reschedule, or cancel appointments through voice conversation. The agent collects required details, checks availability via calendar integration, and confirms booking.

## Actors

- **Caller** — Patient, client, or customer booking a service
- **AI agent** — Appointment module enabled on receptionist platform
- **Calendar integration** — External scheduling system (adapter-connected)

## Goals

- Reduce phone tag and manual scheduling load
- Capture appointment details accurately
- Confirm date, time, and service type verbally
- Send confirmation via notification adapter

## Typical Conversation Flow

1. Caller expresses desire to book, reschedule, or cancel
2. Agent collects: service type, preferred date/time, contact info (fictional in demos)
3. Workflow queries calendar integration for availability
4. Agent offers available slots; caller selects
5. Workflow creates hold/booking and sends confirmation
6. Summary persisted for operator review

## Enabled Modules

- `receptionist`
- `appointments` (required)
- Optional: `follow-up` for reminder notifications

## Configuration Highlights

- `workflows` — Reference to appointment-booking workflow
- `integrations` — Calendar connector definition
- `modules.appointments` — Service types, duration defaults, booking rules

## Success Metrics

- Booking completion rate
- Slot offer-to-confirmation ratio
- No-show rate (tracked post-implementation)
- Manual intervention rate

## Fictional Example

**Bright Smile Dental (Fictional)** — Caller books a routine cleaning; agent offers two fictional slots and confirms via SMS to a `+1-555-01xx` number.

See [examples/workflows/appointment-booking.yaml](../../examples/workflows/appointment-booking.yaml).
