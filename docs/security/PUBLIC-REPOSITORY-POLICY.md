# Public Repository Policy

This repository is intentionally public. Everything committed must be safe for unrestricted visibility on the internet.

## Safe to Commit

| Category | Examples |
|----------|----------|
| Architecture documentation | Diagrams, design decisions, roadmaps |
| Fictional configuration | Example tenants with made-up business names |
| JSON schemas | Draft configuration schemas (v0.1) |
| Placeholder environment templates | `.env.example` with empty or dummy values |
| Generic prompts | Fictional receptionist prompts with no real business data |
| Workflow structure examples | YAML showing step types, not production logic |
| Sanitized Phase 1 implementation | Public text-simulator code under `src/` (mock AI, in-memory persistence, demo UI, API) |
| Placeholder directories for later phases | `.gitkeep` stubs for voice, telephony, modules, dashboard, etc. |
| Open-source license | MIT LICENSE |
| Sanitized screenshots | UI captures with fictional data only (when added later) |

## Never Commit

| Category | Examples |
|----------|----------|
| Secrets and credentials | API keys, tokens, passwords, private keys, JWT secrets |
| Real customer data | Names, phone numbers, emails, addresses, live transcripts |
| Production configuration | Internal URLs, production database connection strings |
| Proprietary source code | Code copied from private production repositories |
| Proprietary prompts | Production system prompts or customer-specific prompt packs |
| Real telephony identifiers | Production phone numbers, SIP credentials, Twilio SIDs |
| Internal business logic | Proprietary pricing, routing rules from live customers |
| Recordings and exports | Audio files, call exports, CRM dumps |
| `.env` files | Any file containing actual environment values |

## Contributor Checklist

Before opening a pull request:

- [ ] No secrets or credentials in any file
- [ ] All business names and contact info are clearly fictional
- [ ] No references to real customer identifiers
- [ ] No imports or copies from private repositories
- [ ] `.env.example` updated if new variables are introduced (placeholders only)
- [ ] Logs and screenshots redacted or synthetic

## Handling Mistakes

If a secret is accidentally committed:

1. **Rotate the credential immediately** — assume it is compromised.
2. Remove from git history if necessary (requires force-push coordination).
3. Document the incident internally; do not include real secret values in issues or PRs.

## Relationship to Private Systems

This public repository is a **sanitized reference implementation**. Private production systems remain separate. Comparisons with production platforms must use only information explicitly approved for public release by the repository owner.

## Related Documents

- [Secrets and Data Protection](SECRETS-AND-DATA-PROTECTION.md)
- [Tenant Configuration](../architecture/TENANT-CONFIGURATION.md)
