import type {
  AICompletionContext,
  AICompletionResult,
  AIProvider,
  TenantConfig,
} from "@/core/types";

type MockIntent =
  | "empty"
  | "emergency"
  | "appointment_with_preference"
  | "appointment"
  | "greeting"
  | "general"
  | "fallback";

const GREETING_PATTERN =
  /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b/i;
const APPOINTMENT_PATTERN =
  /\b(book|booking|schedule|appointment|reschedule|availability|available|slot|slots)\b/i;
const TIME_PREFERENCE_PATTERN =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|next week|this week|morning|afternoon|evening|anything|any time|anytime|\d{1,2}(:\d{2})?\s*(am|pm)?|\d{4}-\d{2}-\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
const EMERGENCY_PATTERN =
  /\b(emergency|urgent|severe pain|bleeding|can'?t breathe|immediate help)\b/i;
const GENERAL_QUESTION_PATTERN =
  /\b(billing|insurance|hours|open|close|cost|price|help|question|service|location|address|parking|policy|coverage)\b/i;

function businessNameForDialogue(displayName: string): string {
  return displayName.replace(/\s*\(Fictional\)\s*$/i, "").trim();
}

function detectIntent(message: string): MockIntent {
  const normalized = message.trim();

  if (!normalized) {
    return "empty";
  }

  if (EMERGENCY_PATTERN.test(normalized)) {
    return "emergency";
  }

  if (APPOINTMENT_PATTERN.test(normalized) || TIME_PREFERENCE_PATTERN.test(normalized)) {
    if (TIME_PREFERENCE_PATTERN.test(normalized)) {
      return "appointment_with_preference";
    }
    return "appointment";
  }

  if (GREETING_PATTERN.test(normalized)) {
    return "greeting";
  }

  if (GENERAL_QUESTION_PATTERN.test(normalized)) {
    return "general";
  }

  return "fallback";
}

function buildResponse(
  intent: MockIntent,
  tenant: TenantConfig,
  message: string,
): AICompletionResult {
  const agentName = tenant.branding.agentName;
  const businessName = businessNameForDialogue(tenant.displayName);

  switch (intent) {
    case "empty":
      return {
        assistantMessage: `Hello! I'm ${agentName}, the virtual receptionist for ${businessName}. How can I help you today?`,
      };

    case "emergency":
      return {
        assistantMessage:
          "If this is a medical emergency, please call emergency services immediately. For urgent dental concerns, contact a licensed dental provider.",
      };

    case "appointment_with_preference":
      return {
        toolCall: {
          name: "check_availability",
          input: {
            timePreference: message.trim(),
          },
        },
      };

    case "appointment":
      return {
        assistantMessage:
          "I can check our demo availability. Do you have a preferred day or time?",
      };

    case "greeting":
      return {
        assistantMessage: `Hello! I'm ${agentName}, the virtual receptionist for ${businessName}. How can I help you today?`,
      };

    case "general":
      return {
        assistantMessage:
          "I can help with general questions or check appointment availability. What would you like help with?",
      };

    case "fallback":
      return {
        assistantMessage:
          "I'm happy to help with office hours, services, or appointment availability. Could you tell me a little more about what you need?",
      };
  }
}

export class MockAIProvider implements AIProvider {
  async complete(context: AICompletionContext): Promise<AICompletionResult> {
    const intent = detectIntent(context.userMessage);
    return buildResponse(intent, context.tenant, context.userMessage);
  }
}

export { detectIntent, buildResponse, businessNameForDialogue };
