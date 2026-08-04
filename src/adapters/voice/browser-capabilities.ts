import type { VoiceCapability } from "@/core/voice/types";

/**
 * Optional host snapshot for capability detection.
 * Tests inject mocks; production uses {@link readBrowserCapabilityHost}.
 */
export interface BrowserCapabilityHost {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
  speechSynthesis?: unknown;
  mediaDevices?: unknown;
}

function isFunction(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === "function";
}

function readProperty(target: object, key: string): unknown {
  try {
    return Reflect.get(target, key);
  } catch {
    return undefined;
  }
}

/**
 * Safely inspect browser globals without unguarded `window` / `navigator` access.
 * Returns `null` during SSR / Node where a browser `window` is unavailable.
 * Does not request permissions or start audio capture.
 */
export function readBrowserCapabilityHost(): BrowserCapabilityHost | null {
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

  const win = maybeWindow;

  let maybeNavigator: unknown;
  try {
    maybeNavigator = Reflect.get(globalThis, "navigator");
  } catch {
    maybeNavigator = undefined;
  }

  const mediaDevices =
    typeof maybeNavigator === "object" && maybeNavigator !== null
      ? readProperty(maybeNavigator, "mediaDevices")
      : undefined;

  return {
    SpeechRecognition: readProperty(win, "SpeechRecognition"),
    webkitSpeechRecognition: readProperty(win, "webkitSpeechRecognition"),
    speechSynthesis: readProperty(win, "speechSynthesis"),
    mediaDevices,
  };
}

function hasSpeechRecognition(host: BrowserCapabilityHost): boolean {
  return (
    isFunction(host.SpeechRecognition) ||
    isFunction(host.webkitSpeechRecognition)
  );
}

function hasSpeechSynthesis(host: BrowserCapabilityHost): boolean {
  const synthesis = host.speechSynthesis;
  if (typeof synthesis !== "object" || synthesis === null) {
    return false;
  }

  return isFunction(readProperty(synthesis, "speak"));
}

function hasMediaCapture(host: BrowserCapabilityHost): boolean {
  const mediaDevices = host.mediaDevices;
  if (typeof mediaDevices !== "object" || mediaDevices === null) {
    return false;
  }

  return isFunction(readProperty(mediaDevices, "getUserMedia"));
}

function unsupportedCapability(): VoiceCapability {
  return {
    speechRecognition: false,
    speechSynthesis: false,
    mediaCapture: false,
    microphone: "unknown",
    supported: false,
  };
}

/**
 * Detect browser voice capabilities without requesting permissions or
 * starting capture. Pass `host` in tests; omit to read from the environment.
 *
 * @param host - Injected host snapshot. `null` forces an unsupported result
 * (useful for SSR tests). `undefined` reads from `globalThis` safely.
 */
export function detectBrowserVoiceCapabilities(
  host?: BrowserCapabilityHost | null,
): VoiceCapability {
  const resolved = host === undefined ? readBrowserCapabilityHost() : host;

  if (resolved === null) {
    return unsupportedCapability();
  }

  const speechRecognition = hasSpeechRecognition(resolved);
  const speechSynthesis = hasSpeechSynthesis(resolved);
  const mediaCapture = hasMediaCapture(resolved);

  return {
    speechRecognition,
    speechSynthesis,
    mediaCapture,
    // Task 2.1 never queries or requests microphone permission.
    microphone: "unknown",
    supported: speechRecognition && speechSynthesis && mediaCapture,
  };
}

/** Convenience: whether the demo may offer browser voice mode controls. */
export function canOfferBrowserVoiceMode(
  host?: BrowserCapabilityHost | null,
): boolean {
  return detectBrowserVoiceCapabilities(host).supported;
}
