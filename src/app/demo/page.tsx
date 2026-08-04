"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

const TENANT_ID = "fictional-dental-clinic";
const BUSINESS_NAME = "Bright Smile Dental (Fictional)";

interface ToolExecution {
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  executedAt: string;
}

interface TranscriptEntry {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolExecution?: ToolExecution;
}

interface ApiResponse {
  sessionId: string;
  assistantMessage: string;
  toolExecutions: ToolExecution[];
  conversationStatus: "active" | "ended";
  timestamps: {
    requestAt: string;
    responseAt: string;
  };
}

function roleLabel(role: "user" | "assistant"): string {
  return role === "user" ? "Caller" : "Receptionist";
}

function toolEventSummary(execution: ToolExecution): string {
  const slots = execution.output.slots;
  const count = Array.isArray(slots) ? slots.length : 0;

  if (execution.toolName === "check_availability") {
    return `Availability checked — ${count} fictional demo slots found`;
  }

  return `${execution.toolName} completed`;
}

function ToolEventCard({ execution }: { execution: ToolExecution }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  return (
    <div className="tool-event-card">
      <div className="tool-event-summary">{toolEventSummary(execution)}</div>
      <button
        type="button"
        className="link-button tool-event-toggle"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? "Hide details" : "View details"}
      </button>
      {expanded && (
        <div id={detailsId} className="tool-event-details">
          <p className="tool-event-details-label">Input</p>
          <pre>{JSON.stringify(execution.input, null, 2)}</pre>
          <p className="tool-event-details-label">Output</p>
          <pre>{JSON.stringify(execution.output, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default function DemoPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [latestToolExecutions, setLatestToolExecutions] = useState<
    ToolExecution[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sessionStatusLabel = useMemo(
    () => (sessionId ? "Session active" : "No active session"),
    [sessionId],
  );

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, loading]);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    const userEntry: TranscriptEntry = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setTranscript((current) => [...current, userEntry]);
    setMessage("");

    try {
      const response = await fetch("/api/conversations/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          sessionId: sessionId ?? undefined,
          message: trimmed,
        }),
      });

      const payload = (await response.json()) as ApiResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Request failed.");
      }

      setSessionId(payload.sessionId);

      const nextEntries: TranscriptEntry[] = [];

      for (const toolExecution of payload.toolExecutions) {
        nextEntries.push({
          id: crypto.randomUUID(),
          role: "tool",
          toolName: toolExecution.toolName,
          content: toolEventSummary(toolExecution),
          toolExecution,
        });
      }

      nextEntries.push({
        id: crypto.randomUUID(),
        role: "assistant",
        content: payload.assistantMessage,
      });

      setTranscript((current) => [...current, ...nextEntries]);
      setLatestToolExecutions(payload.toolExecutions);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send message.",
      );
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function resetConversation() {
    setSessionId(null);
    setTranscript([]);
    setLatestToolExecutions([]);
    setMessage("");
    setError(null);
    setShowSessionDetails(false);
  }

  return (
    <main>
      <div className="card">
        <span className="badge">Text Simulation — Not Production Voice</span>
        <h1>Fictional AI Voice Receptionist — Text Simulation</h1>
        <p>
          This page demonstrates the Phase 1 conversation core using fictional
          tenant data for <strong>{BUSINESS_NAME}</strong>. Responses are
          deterministic mock output — not a live voice agent and not a real
          booking system.
        </p>

        <div className="session-bar">
          <span className="session-status">{sessionStatusLabel}</span>
          {sessionId && (
            <button
              type="button"
              className="link-button"
              onClick={() => setShowSessionDetails((current) => !current)}
            >
              {showSessionDetails ? "Hide technical details" : "Show technical details"}
            </button>
          )}
        </div>

        {showSessionDetails && sessionId && (
          <div className="session-details">
            <p className="meta-line">
              <strong>Session ID:</strong> <code>{sessionId}</code>
            </p>
            {latestToolExecutions.length > 0 && (
              <div className="session-tool-details">
                <p className="meta-line">
                  <strong>Latest tool execution (technical):</strong>
                </p>
                <pre>
                  {JSON.stringify(
                    latestToolExecutions[latestToolExecutions.length - 1],
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="transcript" aria-live="polite">
          {transcript.length === 0 ? (
            <p className="meta-line">
              Try: &quot;Hello&quot;, &quot;I need an appointment&quot;, or
              &quot;This is an emergency&quot;.
            </p>
          ) : (
            transcript.map((entry) =>
              entry.role === "tool" && entry.toolExecution ? (
                <div
                  key={entry.id}
                  className="message tool"
                  aria-label="Tool event"
                >
                  <ToolEventCard execution={entry.toolExecution} />
                </div>
              ) : (
                <div key={entry.id} className={`message ${entry.role}`}>
                  <span className="message-meta">
                    {roleLabel(entry.role === "user" ? "user" : "assistant")}
                  </span>
                  <div className="message-body">{entry.content}</div>
                </div>
              ),
            )
          )}

          {loading && (
            <p className="loading-line">Receptionist is responding…</p>
          )}

          <div ref={transcriptEndRef} />
        </div>

        <form className="input-row" onSubmit={sendMessage}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={loading}
            aria-label="Message input"
            rows={2}
          />
          <button type="submit" disabled={loading || !message.trim()}>
            {loading ? "Sending..." : "Send"}
          </button>
        </form>

        <p className="meta-line input-hint">
          Press Enter to send. Shift+Enter for a new line.
        </p>

        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={resetConversation}
            disabled={loading}
          >
            Reset conversation
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
