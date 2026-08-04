# Secrets and Data Protection

This document defines how secrets, customer data, and sensitive artifacts must be handled across all deployment models.

## Environment Variables

| Rule | Detail |
|------|--------|
| Template only in repo | Commit `.env.example`; never commit `.env` |
| Placeholder values | Use empty strings or obvious placeholders (`replace-me`) |
| Runtime injection | Production values from secrets manager, CI variables, or host env |
| No defaults for secrets | Application must fail fast if required secrets are missing |

Required secret categories (names illustrative):

- AI provider API keys
- Voice provider credentials
- Telephony account tokens
- Database connection strings
- Authentication signing secrets
- Integration OAuth tokens

## Secret Management by Deployment Model

| Model | Recommended approach |
|-------|---------------------|
| Public demo | CI/CD secrets; short-lived sandbox keys |
| Multi-tenant cloud | Managed secrets store with per-tenant namespaces |
| Isolated customer | Customer-scoped secrets path in managed store |
| Customer VPS | Customer-operated `.env`, HashiCorp Vault, or cloud secret service |

Secrets must never appear in tenant YAML/JSON configuration files.

## Fictional Sample Data

All committed examples must use:

- Fictional business names (e.g. "Bright Smile Dental (Fictional)")
- Fake phone numbers (e.g. `+1-555-0100` range)
- Example domains (e.g. `*.example-fictional-business.test`)
- Placeholder API key format (e.g. `sk-fictional-xxxxxxxx`)

## Log Redaction

Application logging must redact or omit:

- Full phone numbers (mask middle digits)
- Email addresses in production logs
- API keys and authorization headers
- Raw transcript content at `info` level or below
- Integration payloads containing PII

Structured log fields should use hashed or truncated identifiers for correlation.

## Transcript Protection

| Control | Description |
|---------|-------------|
| Access control | Dashboard requires authenticated operator role |
| Tenant isolation | Queries scoped by `tenant_id` |
| Redaction | Configurable PII redaction before storage (names, numbers, emails) |
| Retention | `data_retention.transcript_days` in tenant config; enforced by cleanup job |
| Export restrictions | Bulk export requires elevated role; audit logged |

## Recording Protection

| Control | Description |
|---------|-------------|
| Opt-in per tenant | `features.recording_enabled` in tenant config |
| Encrypted storage | Recordings at rest encrypted (deployment infrastructure responsibility) |
| Short retention | Default 30 days unless tenant policy specifies otherwise |
| No public URLs | Recordings served through authenticated, time-limited signed URLs |
| Demo deployments | Recording disabled by default |

## Customer Data Isolation

### Multi-tenant cloud

- All persistence tables include `tenant_id`
- Row-level security policies in PostgreSQL
- Tenant config loaded per session; no cross-tenant cache without tenant key
- Integration credentials scoped to tenant secret namespace

### Isolated and VPS deployments

- Single tenant per database instance
- No multi-tenant tables required; simpler isolation model
- Customer responsible for backup encryption (VPS model)

## Data Classification

| Class | Storage | Public repo |
|-------|---------|-------------|
| Public docs | Git repository | Yes |
| Tenant config (non-secret) | Git or config store | Yes (fictional only) |
| Secrets | Secrets manager / `.env` | Never |
| Transcripts | Database | Never |
| Recordings | Object storage | Never |
| Lead/caller PII | Database | Never |

## Incident Response (Outline)

1. Identify scope (tenant, data type, exposure window)
2. Rotate affected credentials
3. Notify affected customers per contract/policy
4. Review logs for unauthorized access
5. Post-incident: update schemas, validation, or CI checks to prevent recurrence

## Related Documents

- [Public Repository Policy](PUBLIC-REPOSITORY-POLICY.md)
- [Deployment Models](../architecture/DEPLOYMENT-MODELS.md)
- [Tenant Configuration](../architecture/TENANT-CONFIGURATION.md)
