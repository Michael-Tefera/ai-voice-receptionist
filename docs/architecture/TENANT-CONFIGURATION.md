# Tenant Configuration

Tenant configuration externalizes all customer-specific behavior from the platform core. Each deployment loads one or more tenant config files validated against `schemas/tenant-config.schema.json`.

## Configuration Sections

### Tenant identity and branding

Defines who the agent represents.

| Field | Purpose |
|-------|---------|
| `tenant_id` | Stable slug (e.g. `fictional-dental-clinic`) |
| `display_name` | Business name shown in dashboard and prompts |
| `industry` | Industry tag for module defaults and analytics |
| `branding` | Voice name, greeting style, language, locale |
| `contact` | Public-facing contact info (fictional in examples) |

### Prompts and conversation behavior

| Field | Purpose |
|-------|---------|
| `system_prompt` | Base instructions for the AI agent |
| `prompt_overrides` | Per-module or per-scenario prompt fragments |
| `conversation` | Max turn limits, silence handling, interruption policy |
| `persona` | Tone, formality, vocabulary constraints |

Prompts should be stored as files referenced by path, keeping YAML config readable.

### Business hours

| Field | Purpose |
|-------|---------|
| `timezone` | IANA timezone (e.g. `America/Chicago`) |
| `schedule` | Weekly open/close blocks |
| `holidays` | Closed dates |
| `after_hours` | Behavior when closed (message, callback, emergency routing) |

### Routing and escalation

| Field | Purpose |
|-------|---------|
| `routing` | Intent-to-destination mapping (module, human queue, voicemail) |
| `escalation` | Triggers (keywords, sentiment, explicit request) and handoff targets |
| `fallback` | Default behavior when intent is unclear |

### Knowledge sources

| Field | Purpose |
|-------|---------|
| `knowledge.sources[].type` | `inline`, `file`, or `url` (URLs must be public/sandbox in examples) |
| `knowledge.sources[].content_ref` | Path to content file when `type` is `file` |
| `refresh_policy` | How often external knowledge is reloaded |

Knowledge content lives in tenant-owned files, not in `src/core`.

### Enabled modules

```yaml
enabled_modules:
  - receptionist
  - appointments
  - leads
```

Only listed modules are loaded and their tools registered with the runtime.

### Integrations

References to integration definition files (validated against `schemas/integration.schema.json`). Credentials are **not** stored in tenant config — only integration IDs and non-secret parameters.

The `id` field in tenant config corresponds to `integration_id` in the integration definition file referenced by `config_ref`.

```yaml
integrations:
  - id: fictional-calendar
    type: calendar
    config_ref: examples/integrations/fictional-calendar.yaml
```

### Workflow settings

| Field | Purpose |
|-------|---------|
| `workflows` | List of workflow definition paths |
| `default_workflows` | Workflow triggered on session start/end/events |
| `workflow_policy` | Timeouts, retry counts, concurrent execution limits |

### Deployment settings

| Field | Purpose |
|-------|---------|
| `deployment.profile` | `demo`, `cloud-multi-tenant`, `isolated`, `vps` |
| `features` | Feature flags (recording, transcript storage, analytics) |
| `data_retention` | Transcript and recording retention days |
| `channels` | Enabled channels: `telephony`, `browser` |

## Configuration Inheritance

Tenants may extend a base profile to reduce duplication:

```yaml
extends: profiles/base-receptionist.yaml

tenant_id: fictional-dental-clinic
display_name: Bright Smile Dental (Fictional)
# … overrides only what differs from base
```

Resolution order (later wins):

1. Platform defaults (built into runtime, non-customer-specific)
2. Base profile (`extends`)
3. Tenant file overrides
4. Environment-specific overlay (optional, loaded from secrets-safe path)

## Validation

All tenant configs must:

1. Pass JSON Schema validation (`tenant-config.schema.json`)
2. Reference only existing module names and workflow files
3. Contain no secrets, API keys, or real customer identifiers
4. Use fictional data in public repository examples

Validation runs at startup and in CI when tenant files change.

## Example Structure

See:

- [examples/tenants/fictional-dental-clinic.yaml](../../examples/tenants/fictional-dental-clinic.yaml)
- [examples/tenants/fictional-home-services.yaml](../../examples/tenants/fictional-home-services.yaml)

## Related Documents

- [Target Architecture](TARGET-ARCHITECTURE.md)
- [Deployment Models](DEPLOYMENT-MODELS.md)
- [Secrets and Data Protection](../security/SECRETS-AND-DATA-PROTECTION.md)
