import { describe, expect, it } from "vitest";
import {
  canOfferBrowserVoiceMode,
  detectBrowserVoiceCapabilities,
  type BrowserCapabilityHost,
} from "@/adapters/voice/browser-capabilities";

function fullySupportedHost(): BrowserCapabilityHost {
  return {
    SpeechRecognition: class MockSpeechRecognition {},
    speechSynthesis: {
      speak() {
        return undefined;
      },
    },
    mediaDevices: {
      getUserMedia() {
        return Promise.reject(new Error("must not be called"));
      },
    },
  };
}

describe("detectBrowserVoiceCapabilities", () => {
  it("returns unsupported capabilities in a server-side environment with no browser host", () => {
    const capability = detectBrowserVoiceCapabilities(null);

    expect(capability).toEqual({
      speechRecognition: false,
      speechSynthesis: false,
      mediaCapture: false,
      microphone: "unknown",
      supported: false,
    });
    expect(canOfferBrowserVoiceMode(null)).toBe(false);
  });

  it("reports fully supported browser mocks as voice-mode available", () => {
    const host = fullySupportedHost();
    const capability = detectBrowserVoiceCapabilities(host);

    expect(capability.speechRecognition).toBe(true);
    expect(capability.speechSynthesis).toBe(true);
    expect(capability.mediaCapture).toBe(true);
    expect(capability.microphone).toBe("unknown");
    expect(capability.supported).toBe(true);
    expect(canOfferBrowserVoiceMode(host)).toBe(true);
  });

  it("accepts webkit-prefixed speech recognition constructors", () => {
    const capability = detectBrowserVoiceCapabilities({
      webkitSpeechRecognition: class MockWebkitSpeechRecognition {},
      speechSynthesis: { speak() {} },
      mediaDevices: { getUserMedia() {} },
    });

    expect(capability.speechRecognition).toBe(true);
    expect(capability.supported).toBe(true);
  });

  it("marks voice mode unavailable when STT is unsupported", () => {
    const capability = detectBrowserVoiceCapabilities({
      speechSynthesis: { speak() {} },
      mediaDevices: { getUserMedia() {} },
    });

    expect(capability.speechRecognition).toBe(false);
    expect(capability.speechSynthesis).toBe(true);
    expect(capability.mediaCapture).toBe(true);
    expect(capability.supported).toBe(false);
    expect(canOfferBrowserVoiceMode({
      speechSynthesis: { speak() {} },
      mediaDevices: { getUserMedia() {} },
    })).toBe(false);
  });

  it("marks voice mode unavailable when TTS is unsupported", () => {
    const capability = detectBrowserVoiceCapabilities({
      SpeechRecognition: class MockSpeechRecognition {},
      speechSynthesis: {},
      mediaDevices: { getUserMedia() {} },
    });

    expect(capability.speechRecognition).toBe(true);
    expect(capability.speechSynthesis).toBe(false);
    expect(capability.mediaCapture).toBe(true);
    expect(capability.supported).toBe(false);
  });

  it("marks voice mode unavailable when media capture is unsupported", () => {
    const capability = detectBrowserVoiceCapabilities({
      SpeechRecognition: class MockSpeechRecognition {},
      speechSynthesis: { speak() {} },
      mediaDevices: {},
    });

    expect(capability.speechRecognition).toBe(true);
    expect(capability.speechSynthesis).toBe(true);
    expect(capability.mediaCapture).toBe(false);
    expect(capability.supported).toBe(false);
  });

  it("never requests microphone permission and leaves microphone as unknown", () => {
    let getUserMediaCalls = 0;
    const host: BrowserCapabilityHost = {
      SpeechRecognition: class MockSpeechRecognition {},
      speechSynthesis: { speak() {} },
      mediaDevices: {
        getUserMedia() {
          getUserMediaCalls += 1;
          return Promise.reject(new Error("permission must not be requested"));
        },
      },
    };

    const capability = detectBrowserVoiceCapabilities(host);

    expect(getUserMediaCalls).toBe(0);
    expect(capability.microphone).toBe("unknown");
  });

  it("uses the real environment safely under Vitest node (no window)", () => {
    // Vitest runs in node by default; detection must not throw.
    const capability = detectBrowserVoiceCapabilities();
    expect(capability.microphone).toBe("unknown");
    expect(typeof capability.supported).toBe("boolean");
    expect(capability.supported).toBe(false);
  });
});
