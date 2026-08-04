import type { ConversationRepository, ConversationSession } from "@/core/types";

export class InMemoryConversationRepository implements ConversationRepository {
  private readonly sessions = new Map<string, ConversationSession>();

  async create(session: ConversationSession): Promise<void> {
    this.sessions.set(session.id, structuredClone(session));
  }

  async get(sessionId: string): Promise<ConversationSession | null> {
    const session = this.sessions.get(sessionId);
    return session ? structuredClone(session) : null;
  }

  async save(session: ConversationSession): Promise<void> {
    if (!this.sessions.has(session.id)) {
      throw new Error(`Session not found: ${session.id}`);
    }
    this.sessions.set(session.id, structuredClone(session));
  }

  clear(): void {
    this.sessions.clear();
  }
}
