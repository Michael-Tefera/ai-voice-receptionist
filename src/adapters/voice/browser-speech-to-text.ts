import {
  createVoiceError,
  type SpeechToTextProvider,
  type SpeechToTextStartOptions,
  type VoiceErrorCode,
} from "@/core/voice/types";

const DEFAULT_LANGUAGE = "en-US";

export type SpeechRecognitionConstructor = BrowserSpeechRecognitionConstructor;

export interface BrowserSpeechToTextOptions {
  /**
   * Optional constructor resolver for tests.
   * Production omits this and reads guarded browser globals lazily.
   */
  getConstructor?: () => SpeechRecognitionConstructor | null;
}

type SessionPhase = "starting" | "listening" | "stopping" | "completed";

interface ActiveSession {
  id: number;
  recognition: BrowserSpeechRecognition;
  phase: SessionPhase;
  cancelled: boolean;
  transcriptParts: string[];
  settledTranscript: string | null;
  startResolve: (() => void) | null;
  startReject: ((error: Error) => void) | null;
  stopResolve: ((transcript: string) => void) | null;
  stopReject: ((error: Error) => void) | null;
  abortResolve: (() => void) | null;
}

function isConstructor(value: unknown): value is SpeechRecognitionConstructor {
  return typeof value === "function";
}

function readWindowConstructor(): SpeechRecognitionConstructor | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  let maybeWindow: unknown;
  try {
    maybeWindow = Reflect.get(globalThis, "window");
  } catch {
    return null;
  }

  if (typeof maybeWindow !== "object" || maybeWindow === null) {
    return null;
  }

  try {
    const standard = Reflect.get(maybeWindow, "SpeechRecognition");
    if (isConstructor(standard)) {
      return standard;
    }

    const webkit = Reflect.get(maybeWindow, "webkitSpeechRecognition");
    if (isConstructor(webkit)) {
      return webkit;
    }
  } catch {
    return null;
  }

  return null;
}

function mapRecognitionError(errorCode: string): {
  code: VoiceErrorCode;
  message: string;
  retryable: boolean;
} {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return {
        code: "permission-denied",
        message: "Microphone access was denied for speech recognition.",
        retryable: true,
      };
    case "no-speech":
      return {
        code: "recognition-failed",
        message: "No speech was detected. Please try again.",
        retryable: true,
      };
    case "aborted":
      return {
        code: "aborted",
        message: "Speech recognition was cancelled.",
        retryable: true,
      };
    case "audio-capture":
      return {
        code: "recognition-failed",
        message: "Microphone capture is unavailable.",
        retryable: true,
      };
    case "network":
      return {
        code: "recognition-failed",
        message: "Speech recognition failed due to a network error.",
        retryable: true,
      };
    default:
      return {
        code: "recognition-failed",
        message: "Speech recognition failed. Please try again or continue with text.",
        retryable: true,
      };
  }
}

function collectFinalTranscript(event: BrowserSpeechRecognitionEvent): string {
  let text = "";
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    if (!result?.isFinal) {
      continue;
    }
    const alternative = result[0];
    if (alternative?.transcript) {
      text += alternative.transcript;
    }
  }
  return text;
}

/**
 * Browser-native push-to-talk speech-to-text adapter.
 * Does not upload or persist raw audio and does not call the conversation API.
 */
export class BrowserSpeechToTextProvider implements SpeechToTextProvider {
  private readonly getConstructor: () => SpeechRecognitionConstructor | null;
  private session: ActiveSession | null = null;
  private nextSessionId = 1;
  private recognitionCreatedCount = 0;

  constructor(options: BrowserSpeechToTextOptions = {}) {
    this.getConstructor = options.getConstructor ?? readWindowConstructor;
  }

  /** Test helper: how many recognition instances were constructed. */
  getRecognitionCreatedCount(): number {
    return this.recognitionCreatedCount;
  }

  isSupported(): boolean {
    return this.getConstructor() !== null;
  }

  async start(options: SpeechToTextStartOptions = {}): Promise<void> {
    if (this.session && this.session.phase !== "completed") {
      throw createVoiceError(
        "recognition-failed",
        "Speech recognition is already active.",
        true,
      );
    }

    const Constructor = this.getConstructor();
    if (!Constructor) {
      throw createVoiceError(
        "unsupported",
        "Speech recognition is not available in this browser.",
        false,
      );
    }

    const recognition = new Constructor();
    this.recognitionCreatedCount += 1;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang =
      typeof options.language === "string" && options.language.trim()
        ? options.language.trim()
        : DEFAULT_LANGUAGE;

    const session: ActiveSession = {
      id: this.nextSessionId++,
      recognition,
      phase: "starting",
      cancelled: false,
      transcriptParts: [],
      settledTranscript: null,
      startResolve: null,
      startReject: null,
      stopResolve: null,
      stopReject: null,
      abortResolve: null,
    };
    this.session = session;

    this.bindHandlers(session);

    return new Promise<void>((resolve, reject) => {
      if (this.session?.id !== session.id) {
        reject(
          createVoiceError(
            "aborted",
            "Speech recognition session was cancelled.",
            true,
          ),
        );
        return;
      }

      session.startResolve = resolve;
      session.startReject = reject;

      try {
        recognition.start();
      } catch {
        this.failSession(
          session,
          createVoiceError(
            "recognition-failed",
            "Unable to start speech recognition.",
            true,
          ),
        );
      }
    });
  }

  async stop(): Promise<string> {
    const session = this.session;
    if (!session || session.phase === "completed") {
      throw createVoiceError(
        "recognition-failed",
        "No active speech recognition session to stop.",
        true,
      );
    }

    if (session.cancelled) {
      throw createVoiceError(
        "aborted",
        "Speech recognition was cancelled.",
        true,
      );
    }

    if (session.settledTranscript !== null) {
      const transcript = session.settledTranscript;
      this.completeSession(session);
      if (!transcript) {
        throw createVoiceError(
          "empty-transcript",
          "No speech was captured. Please try again or continue with text.",
          true,
        );
      }
      return transcript;
    }

    session.phase = "stopping";

    return new Promise<string>((resolve, reject) => {
      if (session.cancelled || this.session?.id !== session.id) {
        reject(
          createVoiceError(
            "aborted",
            "Speech recognition was cancelled.",
            true,
          ),
        );
        return;
      }

      session.stopResolve = resolve;
      session.stopReject = reject;

      try {
        session.recognition.stop();
      } catch {
        // Recognition may already be stopping/ended; wait for onend/onresult.
      }
    });
  }

  async abort(): Promise<void> {
    const session = this.session;
    if (!session || session.phase === "completed") {
      return;
    }

    if (session.cancelled) {
      return new Promise<void>((resolve) => {
        session.abortResolve = resolve;
      });
    }

    session.cancelled = true;

    if (session.startReject) {
      const reject = session.startReject;
      session.startResolve = null;
      session.startReject = null;
      reject(
        createVoiceError(
          "aborted",
          "Speech recognition was cancelled.",
          true,
        ),
      );
    }

    if (session.stopReject) {
      const reject = session.stopReject;
      session.stopResolve = null;
      session.stopReject = null;
      reject(
        createVoiceError(
          "aborted",
          "Speech recognition was cancelled.",
          true,
        ),
      );
    }

    return new Promise<void>((resolve) => {
      session.abortResolve = resolve;

      try {
        if (typeof session.recognition.abort === "function") {
          session.recognition.abort();
        } else {
          session.recognition.stop();
        }
      } catch {
        this.completeSession(session);
        resolve();
      }

      // Some mocks end synchronously; ensure abort resolves if already cleaned up.
      if (this.session?.id !== session.id) {
        resolve();
      }
    });
  }

  private bindHandlers(session: ActiveSession): void {
    const { recognition } = session;

    recognition.onstart = () => {
      if (!this.isCurrentSession(session) || session.cancelled) {
        return;
      }
      session.phase = "listening";
      if (session.startResolve) {
        const resolve = session.startResolve;
        session.startResolve = null;
        session.startReject = null;
        resolve();
      }
    };

    recognition.onresult = (event) => {
      if (!this.isCurrentSession(session) || session.cancelled) {
        return;
      }
      const chunk = collectFinalTranscript(event);
      if (chunk) {
        session.transcriptParts.push(chunk);
      }
    };

    recognition.onerror = (event) => {
      if (!this.isCurrentSession(session)) {
        return;
      }

      if (session.cancelled) {
        // Expected when abort() triggers an aborted error from the browser.
        return;
      }

      const mapped = mapRecognitionError(event.error);
      this.failSession(
        session,
        createVoiceError(mapped.code, mapped.message, mapped.retryable),
      );
    };

    recognition.onend = () => {
      if (!this.isCurrentSession(session)) {
        return;
      }

      if (session.cancelled) {
        this.completeSession(session);
        return;
      }

      const transcript = session.transcriptParts.join("").trim();
      session.settledTranscript = transcript;

      if (session.stopResolve || session.stopReject || session.phase === "stopping") {
        this.resolveStop(session, transcript);
        return;
      }

      // Recognition ended before stop() (single-utterance). Keep transcript for stop().
      if (session.startResolve) {
        // Started and ended before onstart was observed in some environments.
        const resolve = session.startResolve;
        session.startResolve = null;
        session.startReject = null;
        session.phase = "listening";
        resolve();
      }
    };
  }

  private resolveStop(session: ActiveSession, transcript: string): void {
    if (session.stopResolve) {
      const resolve = session.stopResolve;
      const reject = session.stopReject;
      session.stopResolve = null;
      session.stopReject = null;
      this.completeSession(session);

      if (!transcript) {
        reject?.(
          createVoiceError(
            "empty-transcript",
            "No speech was captured. Please try again or continue with text.",
            true,
          ),
        );
        return;
      }
      resolve(transcript);
      return;
    }

    this.completeSession(session);
  }

  private failSession(session: ActiveSession, error: Error): void {
    if (!this.isCurrentSession(session) || session.phase === "completed") {
      return;
    }

    if (session.startReject) {
      const reject = session.startReject;
      session.startResolve = null;
      session.startReject = null;
      this.completeSession(session);
      reject(error);
      return;
    }

    if (session.stopReject) {
      const reject = session.stopReject;
      session.stopResolve = null;
      session.stopReject = null;
      this.completeSession(session);
      reject(error);
      return;
    }

    this.completeSession(session);
  }

  private completeSession(session: ActiveSession): void {
    if (session.phase === "completed") {
      if (session.abortResolve) {
        const resolve = session.abortResolve;
        session.abortResolve = null;
        resolve();
      }
      return;
    }

    session.phase = "completed";
    this.unbindHandlers(session.recognition);

    if (this.session?.id === session.id) {
      this.session = null;
    }

    if (session.abortResolve) {
      const resolve = session.abortResolve;
      session.abortResolve = null;
      resolve();
    }
  }

  private unbindHandlers(recognition: BrowserSpeechRecognition): void {
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  }

  private isCurrentSession(session: ActiveSession): boolean {
    return this.session?.id === session.id;
  }
}
