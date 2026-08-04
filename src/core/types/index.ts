export type ConversationStatus = "active" | "ended";

export type MessageRole = "user" | "assistant" | "tool";

export interface TenantBranding {
  agentName: string;
  greeting: string;
  language: string;
}

export interface TenantConfig {
  tenantId: string;
  displayName: string;
  industry?: string;
  branding: TenantBranding;
  enabledModules: string[];
  afterHoursMessage?: string;
}

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  toolName?: string;
}

export interface ConversationSession {
  id: string;
  tenantId: string;
  status: ConversationStatus;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationRequest {
  tenantId: string;
  sessionId?: string;
  message: string;
}

export interface ToolExecutionResult {
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  executedAt: string;
}

export interface ConversationResult {
  sessionId: string;
  assistantMessage: string;
  toolExecutions: ToolExecutionResult[];
  conversationStatus: ConversationStatus;
  timestamps: {
    requestAt: string;
    responseAt: string;
  };
}

export interface AICompletionContext {
  tenant: TenantConfig;
  messages: ConversationMessage[];
  userMessage: string;
}

export interface AIToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface AICompletionResult {
  assistantMessage?: string;
  toolCall?: AIToolCall;
}

export interface AIProvider {
  complete(context: AICompletionContext): Promise<AICompletionResult>;
}

export interface ConversationRepository {
  create(session: ConversationSession): Promise<void>;
  get(sessionId: string): Promise<ConversationSession | null>;
  save(session: ConversationSession): Promise<void>;
}

export interface TenantConfigRepository {
  getById(tenantId: string): Promise<TenantConfig | null>;
}

export interface ToolExecutionContext {
  tenant: TenantConfig;
  session: ConversationSession;
  input: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  execute(context: ToolExecutionContext): Promise<Record<string, unknown>>;
}

export interface ToolRegistry {
  get(name: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
  execute(
    name: string,
    context: ToolExecutionContext,
  ): Promise<Record<string, unknown>>;
}
