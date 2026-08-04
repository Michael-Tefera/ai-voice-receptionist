import { readFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { TenantConfig, TenantConfigRepository } from "@/core/types";

interface RawTenantYaml {
  tenant_id: string;
  display_name: string;
  industry?: string;
  branding?: {
    agent_name?: string;
    greeting?: string;
    language?: string;
  };
  enabled_modules?: string[];
  business_hours?: {
    after_hours?: {
      message?: string;
    };
  };
}

function normalizeTenant(raw: RawTenantYaml): TenantConfig {
  return {
    tenantId: raw.tenant_id,
    displayName: raw.display_name,
    industry: raw.industry,
    branding: {
      agentName: raw.branding?.agent_name ?? "Assistant",
      greeting: raw.branding?.greeting?.trim() ?? "Hello! How can I help you today?",
      language: raw.branding?.language ?? "en-US",
    },
    enabledModules: raw.enabled_modules ?? ["receptionist"],
    afterHoursMessage: raw.business_hours?.after_hours?.message?.trim(),
  };
}

export class StaticTenantConfigRepository implements TenantConfigRepository {
  private readonly tenants = new Map<string, TenantConfig>();

  constructor(tenantFiles: Record<string, string>) {
    for (const [tenantId, filePath] of Object.entries(tenantFiles)) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);
      const contents = readFileSync(absolutePath, "utf8");
      const parsed = yaml.load(contents) as RawTenantYaml;

      if (parsed.tenant_id !== tenantId) {
        throw new Error(
          `Tenant file mismatch: expected ${tenantId}, found ${parsed.tenant_id}`,
        );
      }

      this.tenants.set(tenantId, normalizeTenant(parsed));
    }
  }

  async getById(tenantId: string): Promise<TenantConfig | null> {
    return this.tenants.get(tenantId) ?? null;
  }
}

export function createDefaultTenantRepository(): StaticTenantConfigRepository {
  return new StaticTenantConfigRepository({
    "fictional-dental-clinic": "examples/tenants/fictional-dental-clinic.yaml",
    "fictional-home-services": "examples/tenants/fictional-home-services.yaml",
  });
}
