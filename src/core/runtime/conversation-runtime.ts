import { randomUUID } from "node:crypto";
import type {
  AIProvider,
  ConversationMessage,
  ConversationRepository,
  ConversationRequest,
  ConversationResult,
  ConversationSession,
  TenantConfigRepository,
  ToolExecutionResult,
  ToolRegistry,
} from "@/core/types";

export class TenantNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`Tenant not found: ${tenantId}`);
    this.name = "TenantNotFoundError";
  }
}

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = "SessionNotFoundError";
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function createMessage(
  role: ConversationMessage["role"],
  content: string,
  toolName?: string,
): ConversationMessage {
  return {
    id: randomUUID(),
    role,
    content,
    timestamp: nowIso(),
    toolName,
  };
}

function formatAvailabilityResponse(slots: Array<{ label: string }>): string {
  const slotLines = slots
    .map((slot, index) => `${index + 1}. ${slot.label}`)
    .join("\n");

  return [
    "Here are a few times that may work:",
    slotLines,
    "These are demo slots only — no appointment has been booked.",
    "Would you like one of these times?",
  ].join("\n");
}

export class ConversationRuntime {
  constructor(
    private readonly tenantRepository: TenantConfigRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly aiProvider: AIProvider,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  async handle(request: ConversationRequest): Promise<ConversationResult> {
    const requestAt = nowIso();
    const tenant = await this.tenantRepository.getById(request.tenantId);

    if (!tenant) {
      throw new TenantNotFoundError(request.tenantId);
    }

    let session: ConversationSession;

    if (request.sessionId) {
      const existing = await this.conversationRepository.get(request.sessionId);
      if (!existing) {
        throw new SessionNotFoundError(request.sessionId);
      }
      if (existing.tenantId !== tenant.tenantId) {
        throw new SessionNotFoundError(request.sessionId);
      }
      session = existing;
    } else {
      const createdAt = nowIso();
      session = {
        id: randomUUID(),
        tenantId: tenant.tenantId,
        status: "active",
        messages: [],
        createdAt,
        updatedAt: createdAt,
      };
      await this.conversationRepository.create(session);
    }

    const userMessage = createMessage("user", request.message.trim());
    session.messages.push(userMessage);

    const aiResult = await this.aiProvider.complete({
      tenant,
      messages: session.messages,
      userMessage: request.message,
    });

    const toolExecutions: ToolExecutionResult[] = [];
    let assistantMessage = aiResult.assistantMessage ?? "";

    if (aiResult.toolCall) {
      const output = await this.toolRegistry.execute(aiResult.toolCall.name, {
        tenant,
        session,
        input: aiResult.toolCall.input,
      });

      const executedAt = nowIso();
      toolExecutions.push({
        toolName: aiResult.toolCall.name,
        input: aiResult.toolCall.input,
        output,
        executedAt,
      });

      session.messages.push(
        createMessage(
          "tool",
          JSON.stringify(output),
          aiResult.toolCall.name,
        ),
      );

      if (aiResult.toolCall.name === "check_availability") {
        const slots = Array.isArray(output.slots)
          ? (output.slots as Array<{ label: string }>)
          : [];
        assistantMessage = formatAvailabilityResponse(slots);
      } else {
        assistantMessage =
          assistantMessage ||
          `I completed the requested action using ${aiResult.toolCall.name}.`;
      }
    }

    if (!assistantMessage) {
      assistantMessage = `I'm here to help with ${tenant.displayName}. What would you like to do next?`;
    }

    session.messages.push(createMessage("assistant", assistantMessage));
    session.updatedAt = nowIso();
    await this.conversationRepository.save(session);

    return {
      sessionId: session.id,
      assistantMessage,
      toolExecutions,
      conversationStatus: session.status,
      timestamps: {
        requestAt,
        responseAt: session.updatedAt,
      },
    };
  }
}
