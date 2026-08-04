import { describe, expect, it } from "vitest";
import {
  buildResponse,
  businessNameForDialogue,
  detectIntent,
  MockAIProvider,
} from "@/adapters/ai/mock-ai-provider";
import {
  SessionNotFoundError,
  TenantNotFoundError,
} from "@/core/runtime/conversation-runtime";
import { createConversationRuntimeForTests } from "@/lib/conversation-service";
import { validateConversationRequestBody } from "@/lib/validate-conversation-request";

const DENTAL_TENANT = {
  tenantId: "fictional-dental-clinic",
  displayName: "Bright Smile Dental (Fictional)",
  branding: {
    agentName: "Alex",
    greeting: "Thank you for calling Bright Smile Dental.",
    language: "en-US",
  },
  enabledModules: ["receptionist", "appointments", "leads"],
  afterHoursMessage: "After-hours fictional callback message.",
};

describe("MockAIProvider intents", () => {
  it("detects greeting intent", () => {
    expect(detectIntent("Hello")).toBe("greeting");
  });

  it("detects general appointment intent without invoking a tool", () => {
    expect(detectIntent("I need an appointment")).toBe("appointment");
    const result = buildResponse("appointment", DENTAL_TENANT, "I need an appointment");
    expect(result.toolCall).toBeUndefined();
    expect(result.assistantMessage).toBe(
      "I can check our demo availability. Do you have a preferred day or time?",
    );
  });

  it("detects appointment intent with a time preference for tool execution", () => {
    expect(detectIntent("Do you have anything Tuesday afternoon?")).toBe(
      "appointment_with_preference",
    );
  });

  it("returns a concise emergency response", () => {
    const result = buildResponse("emergency", DENTAL_TENANT, "This is an emergency");
    expect(result.assistantMessage).toBe(
      "If this is a medical emergency, please call emergency services immediately. For urgent dental concerns, contact a licensed dental provider.",
    );
  });

  it("returns a concise greeting without repeating tenant greeting text", () => {
    const result = buildResponse("greeting", DENTAL_TENANT, "Hello");
    expect(result.assistantMessage).toBe(
      "Hello! I'm Alex, the virtual receptionist for Bright Smile Dental. How can I help you today?",
    );
    expect(result.assistantMessage).not.toContain("Thank you for calling");
  });

  it("strips the fictional suffix from dialogue business names", () => {
    expect(businessNameForDialogue("Bright Smile Dental (Fictional)")).toBe(
      "Bright Smile Dental",
    );
  });
});

describe("ConversationRuntime", () => {
  it("creates a new session", async () => {
    const { runtime, repository } = createConversationRuntimeForTests();

    const result = await runtime.handle({
      tenantId: "fictional-dental-clinic",
      message: "Hello",
    });

    expect(result.sessionId).toBeTruthy();
    expect(result.conversationStatus).toBe("active");
    expect(result.assistantMessage).toContain("Alex");

    const saved = await repository.get(result.sessionId);
    expect(saved?.messages.some((entry) => entry.role === "user")).toBe(true);
    expect(saved?.messages.some((entry) => entry.role === "assistant")).toBe(true);
  });

  it("continues an existing session", async () => {
    const { runtime } = createConversationRuntimeForTests();

    const first = await runtime.handle({
      tenantId: "fictional-dental-clinic",
      message: "Hello",
    });

    const second = await runtime.handle({
      tenantId: "fictional-dental-clinic",
      sessionId: first.sessionId,
      message: "What are your hours?",
    });

    expect(second.sessionId).toBe(first.sessionId);
    expect(second.assistantMessage.length).toBeGreaterThan(0);
  });

  it("returns a deterministic receptionist response for greetings", async () => {
    const { runtime } = createConversationRuntimeForTests();

    const result = await runtime.handle({
      tenantId: "fictional-dental-clinic",
      message: "Hi there",
    });

    expect(result.assistantMessage).toBe(
      "Hello! I'm Alex, the virtual receptionist for Bright Smile Dental. How can I help you today?",
    );
    expect(result.toolExecutions).toHaveLength(0);
  });

  it("asks for a preferred time before invoking availability for general appointment requests", async () => {
    const { runtime } = createConversationRuntimeForTests();

    const result = await runtime.handle({
      tenantId: "fictional-dental-clinic",
      message: "I need an appointment",
    });

    expect(result.toolExecutions).toHaveLength(0);
    expect(result.assistantMessage).toContain("preferred day or time");
  });

  it("invokes check_availability when a time preference is provided", async () => {
    const { runtime } = createConversationRuntimeForTests();

    const result = await runtime.handle({
      tenantId: "fictional-dental-clinic",
      message: "Do you have anything Tuesday afternoon?",
    });

    expect(result.toolExecutions).toHaveLength(1);
    expect(result.toolExecutions[0]?.toolName).toBe("check_availability");
    expect(result.assistantMessage).toContain("Here are a few times that may work");
    expect(result.assistantMessage).toContain("no appointment has been booked");
    expect(result.assistantMessage).toContain(
      "Wednesday, August 5 at 9:30 AM (Fictional Demo)",
    );
    expect(result.assistantMessage).toContain(
      "Friday, August 7 at 10:15 AM (Fictional Demo)",
    );
  });

  it("follows the appointment preference flow with corrected demo slot labels", async () => {
    const { runtime } = createConversationRuntimeForTests();

    const first = await runtime.handle({
      tenantId: "fictional-dental-clinic",
      message: "hello, I need an appointment",
    });

    expect(first.toolExecutions).toHaveLength(0);
    expect(first.assistantMessage).toContain("preferred day or time");

    const second = await runtime.handle({
      tenantId: "fictional-dental-clinic",
      sessionId: first.sessionId,
      message: "next week",
    });

    expect(second.toolExecutions).toHaveLength(1);
    expect(second.assistantMessage).toContain(
      "1. Wednesday, August 5 at 9:30 AM (Fictional Demo)",
    );
    expect(second.assistantMessage).toContain(
      "2. Wednesday, August 5 at 2:00 PM (Fictional Demo)",
    );
    expect(second.assistantMessage).toContain(
      "3. Friday, August 7 at 10:15 AM (Fictional Demo)",
    );
    expect(second.assistantMessage).toContain(
      "These are demo slots only — no appointment has been booked.",
    );
  });

  it("returns an emergency-routing response", async () => {
    const { runtime } = createConversationRuntimeForTests();

    const result = await runtime.handle({
      tenantId: "fictional-dental-clinic",
      message: "This is an emergency",
    });

    expect(result.assistantMessage).toContain("call emergency services immediately");
    expect(result.toolExecutions).toHaveLength(0);
  });

  it("returns a general help response for billing questions", async () => {
    const { runtime } = createConversationRuntimeForTests();

    const result = await runtime.handle({
      tenantId: "fictional-dental-clinic",
      message: "Can you help me with billing?",
    });

    expect(result.assistantMessage).toBe(
      "I can help with general questions or check appointment availability. What would you like help with?",
    );
  });

  it("persists conversation messages in the repository", async () => {
    const { runtime, repository } = createConversationRuntimeForTests();

    const result = await runtime.handle({
      tenantId: "fictional-dental-clinic",
      message: "Hello",
    });

    const saved = await repository.get(result.sessionId);
    expect(saved?.messages.length).toBeGreaterThanOrEqual(2);
  });

  it("throws for an invalid tenant", async () => {
    const { runtime } = createConversationRuntimeForTests();

    await expect(
      runtime.handle({
        tenantId: "unknown-tenant",
        message: "Hello",
      }),
    ).rejects.toBeInstanceOf(TenantNotFoundError);
  });

  it("throws when continuing an unknown session", async () => {
    const { runtime } = createConversationRuntimeForTests();

    await expect(
      runtime.handle({
        tenantId: "fictional-dental-clinic",
        sessionId: "missing-session-id",
        message: "Hello",
      }),
    ).rejects.toBeInstanceOf(SessionNotFoundError);
  });
});

describe("MockAIProvider", () => {
  it("is deterministic for the same greeting input", async () => {
    const provider = new MockAIProvider();
    const context = {
      tenant: DENTAL_TENANT,
      messages: [],
      userMessage: "Hello",
    };

    const first = await provider.complete(context);
    const second = await provider.complete(context);

    expect(first.assistantMessage).toBe(second.assistantMessage);
  });
});

describe("validateConversationRequestBody", () => {
  it("accepts a valid request body", () => {
    const result = validateConversationRequestBody({
      tenantId: "fictional-dental-clinic",
      message: "Hello",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.tenantId).toBe("fictional-dental-clinic");
      expect(result.value.message).toBe("Hello");
    }
  });

  it("rejects malformed API input missing tenantId", () => {
    const result = validateConversationRequestBody({ message: "Hello" });
    expect(result.ok).toBe(false);
  });

  it("rejects malformed API input with empty message", () => {
    const result = validateConversationRequestBody({
      tenantId: "fictional-dental-clinic",
      message: "   ",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects malformed API input with invalid sessionId type", () => {
    const result = validateConversationRequestBody({
      tenantId: "fictional-dental-clinic",
      sessionId: 123,
      message: "Hello",
    });
    expect(result.ok).toBe(false);
  });
});
