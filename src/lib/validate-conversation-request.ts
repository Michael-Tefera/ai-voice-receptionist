export interface ParsedConversationRequest {
  tenantId: string;
  sessionId?: string;
  message: string;
}

export type ConversationRequestValidationResult =
  | { ok: true; value: ParsedConversationRequest }
  | { ok: false; error: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

export function validateConversationRequestBody(
  body: unknown,
): ConversationRequestValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON body." };
  }

  const candidate = body as Record<string, unknown>;

  if (!isNonEmptyString(candidate.tenantId)) {
    return {
      ok: false,
      error: "tenantId is required and must be a non-empty string.",
    };
  }

  if (!isNonEmptyString(candidate.message)) {
    return {
      ok: false,
      error: "message is required and must be a non-empty string.",
    };
  }

  if (!isOptionalString(candidate.sessionId)) {
    return { ok: false, error: "sessionId must be a string when provided." };
  }

  return {
    ok: true,
    value: {
      tenantId: candidate.tenantId.trim(),
      sessionId: candidate.sessionId?.trim() || undefined,
      message: candidate.message.trim(),
    },
  };
}
