import { MockAIProvider } from "@/adapters/ai/mock-ai-provider";
import { ConversationRuntime } from "@/core/runtime/conversation-runtime";
import { checkAvailabilityTool } from "@/core/tools/check-availability";
import { createToolRegistry } from "@/core/tools/tool-registry";
import { InMemoryConversationRepository } from "@/persistence/in-memory-conversation-repository";
import { createDefaultTenantRepository } from "@/tenants/static-tenant-config-repository";

const tenantRepository = createDefaultTenantRepository();
const conversationRepository = new InMemoryConversationRepository();
const aiProvider = new MockAIProvider();
const toolRegistry = createToolRegistry([checkAvailabilityTool]);

export const conversationRuntime = new ConversationRuntime(
  tenantRepository,
  conversationRepository,
  aiProvider,
  toolRegistry,
);

export function createConversationRuntimeForTests(): {
  runtime: ConversationRuntime;
  repository: InMemoryConversationRepository;
} {
  const repository = new InMemoryConversationRepository();
  const runtime = new ConversationRuntime(
    tenantRepository,
    repository,
    aiProvider,
    toolRegistry,
  );
  return { runtime, repository };
}
