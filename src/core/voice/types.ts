/**
 * Provider-neutral voice contracts for the browser voice channel layer.
 * ConversationRuntime remains text-in / text-out and does not depend on these types.
 */

export type VoiceSessionState =
  | "idle"
  | "requesting-permission"
  | "listening"
  | "transcribing"
  | "sending"
  | "waiting-for-response"
  | "speaking"
  | "stopped"
  | "unsupported"
  | "error";

export type MicrophonePermissionState =
  | "unknown"
  | "granted"
  | "denied"
  | "prompt";

export type VoiceErrorCode =
  | "unsupported"
  | "permission-denied"
  | "recognition-failed"
  | "empty-transcript"
  | "api-failed"
  | "playback-failed"
  | "aborted";

export interface VoiceError {
  code: VoiceErrorCode;
  /** Safe, user-facing, non-sensitive message. */
  message: string;
  retryable: boolean;
}

/** Throwable error that carries a structured {@link VoiceError} payload. */
export class VoiceProviderError extends Error implements VoiceError {
  readonly code: VoiceErrorCode;
  readonly retryable: boolean;

  constructor(error: VoiceError) {
    super(error.message);
    this.name = "VoiceProviderError";
    this.code = error.code;
    this.retryable = error.retryable;
  }
}

export function createVoiceError(
  code: VoiceErrorCode,
  message: string,
  retryable: boolean,
): VoiceProviderError {
  return new VoiceProviderError({ code, message, retryable });
}

/**
 * Structured capability snapshot.
 * Task 2.1 detection never requests microphone permission, so `microphone`
 * remains `"unknown"` until a later task queries or requests access.
 */
export interface VoiceCapability {
  speechRecognition: boolean;
  speechSynthesis: boolean;
  /** True when `mediaDevices.getUserMedia` exists (does not imply permission). */
  mediaCapture: boolean;
  microphone: MicrophonePermissionState;
  /**
   * True when speech recognition, speech synthesis, and media-capture APIs
   * are present enough to offer browser voice mode in the UI.
   */
  supported: boolean;
}

export interface SpeechToTextStartOptions {
  language?: string;
}

/**
 * Provider-neutral speech-to-text contract.
 * Browser adapter: Task 2.2. Interim/partial results are optional and unused
 * by the initial non-continuous push-to-talk adapter.
 */
export interface SpeechToTextProvider {
  isSupported(): boolean;
  start(options?: SpeechToTextStartOptions): Promise<void>;
  /**
   * Ends the active session and returns the final trimmed transcript.
   * Rejects with {@link VoiceProviderError} (`empty-transcript`) when empty.
   */
  stop(): Promise<string>;
  /**
   * Cancels the active session. Resolves when cancellation cleanup completes.
   * Any in-flight `stop()` promise rejects with `aborted`.
   */
  abort(): Promise<void>;
  onPartial?(callback: (text: string) => void): void;
}

export interface TextToSpeechSpeakOptions {
  language?: string;
}

/**
 * Provider-neutral text-to-speech contract.
 * No adapter implementation is provided in Task 2.1.
 */
export interface TextToSpeechProvider {
  isSupported(): boolean;
  speak(text: string, options?: TextToSpeechSpeakOptions): Promise<void>;
  stop(): Promise<void>;
  isSpeaking(): boolean;
}
