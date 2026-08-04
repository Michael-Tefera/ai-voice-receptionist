import { NextResponse } from "next/server";
import {
  SessionNotFoundError,
  TenantNotFoundError,
} from "@/core/runtime/conversation-runtime";
import { conversationRuntime } from "@/lib/conversation-service";
import { validateConversationRequestBody } from "@/lib/validate-conversation-request";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const validation = validateConversationRequestBody(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await conversationRuntime.handle(validation.value);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Unable to process conversation request." },
      { status: 500 },
    );
  }
}
