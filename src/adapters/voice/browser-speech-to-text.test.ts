import { describe, expect, it } from "vitest";
import { BrowserSpeechToTextProvider } from "@/adapters/voice/browser-speech-to-text";
import { VoiceProviderError } from "@/core/voice/types";

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onstart: ((ev: Event) => void) | null = null;
  onresult: ((ev: BrowserSpeechRecognitionEvent) => void) | null = null;
  onerror: ((ev: BrowserSpeechRecognitionErrorEvent) => void) | null = null;
  onend: ((ev: Event) => void) | null = null;

  startCalls = 0;
  stopCalls = 0;
  abortCalls = 0;

  start(): void {
    this.startCalls += 1;
  }

  stop(): void {
    this.stopCalls += 1;
  }

  abort(): void {
    this.abortCalls += 1;
  }

  emitStart(): void {
    this.onstart?.(new Event("start"));
  }

  emitFinalResult(transcript: string): void {
    const result = {
      isFinal: true,
      length: 1,
      0: { transcript, confidence: 1 },
      item(index: number) {
        return this[index as 0];
      },
    };

    const event = {
      resultIndex: 0,
      results: {
        length: 1,
        0: result,
        item(index: number) {
          return this[index as 0];
        },
      },
    } as unknown as BrowserSpeechRecognitionEvent;

    this.onresult?.(event);
  }

  emitError(error: string): void {
    const event = {
      error,
      message: error,
    } as BrowserSpeechRecognitionErrorEvent;
    this.onerror?.(event);
  }

  emitEnd(): void {
    this.onend?.(new Event("end"));
  }
}

function createProviderWithMock(): {
  provider: BrowserSpeechToTextProvider;
  getLatest: () => MockSpeechRecognition;
  instances: MockSpeechRecognition[];
} {
  const instances: MockSpeechRecognition[] = [];

  const provider = new BrowserSpeechToTextProvider({
    getConstructor: () =>
      function MockConstructor(this: MockSpeechRecognition) {
        const instance = new MockSpeechRecognition();
        instances.push(instance);
        return instance;
      } as unknown as BrowserSpeechRecognitionConstructor,
  });

  return {
    provider,
    instances,
    getLatest: () => {
      const latest = instances[instances.length - 1];
      if (!latest) {
        throw new Error("No recognition instance created");
      }
      return latest;
    },
  };
}

describe("BrowserSpeechToTextProvider", () => {
  it("returns a structured unsupported error when the browser has no constructor", async () => {
    const provider = new BrowserSpeechToTextProvider({
      getConstructor: () => null,
    });

    expect(provider.isSupported()).toBe(false);
    expect(provider.getRecognitionCreatedCount()).toBe(0);

    await expect(provider.start()).rejects.toMatchObject({
      name: "VoiceProviderError",
      code: "unsupported",
      retryable: false,
    });
    expect(provider.getRecognitionCreatedCount()).toBe(0);
  });

  it("does not start recognition during adapter construction", () => {
    let constructorCalls = 0;
    const provider = new BrowserSpeechToTextProvider({
      getConstructor: () => {
        constructorCalls += 1;
        return MockSpeechRecognition as unknown as BrowserSpeechRecognitionConstructor;
      },
    });

    expect(provider).toBeTruthy();
    expect(constructorCalls).toBe(0);
    expect(provider.getRecognitionCreatedCount()).toBe(0);
    // isSupported may call getConstructor but must not construct a recognition instance.
    expect(provider.isSupported()).toBe(true);
    expect(provider.getRecognitionCreatedCount()).toBe(0);
  });

  it("returns a successful trimmed final transcript", async () => {
    const { provider, getLatest } = createProviderWithMock();

    const started = provider.start({ language: "en-US" });
    getLatest().emitStart();
    await started;

    const stopPromise = provider.stop();
    getLatest().emitFinalResult("  Hello dental clinic  ");
    getLatest().emitEnd();

    await expect(stopPromise).resolves.toBe("Hello dental clinic");
    expect(getLatest().onresult).toBeNull();
    expect(getLatest().onerror).toBeNull();
    expect(getLatest().onend).toBeNull();
    expect(getLatest().onstart).toBeNull();
  });

  it("rejects empty final transcripts safely", async () => {
    const { provider, getLatest } = createProviderWithMock();

    const started = provider.start();
    getLatest().emitStart();
    await started;

    const stopPromise = provider.stop();
    getLatest().emitFinalResult("   ");
    getLatest().emitEnd();

    await expect(stopPromise).rejects.toMatchObject({
      code: "empty-transcript",
      retryable: true,
    });
  });

  it("maps permission-denied / not-allowed errors", async () => {
    const { provider, getLatest } = createProviderWithMock();

    const started = provider.start();
    getLatest().emitStart();
    await started;

    const stopPromise = provider.stop();
    getLatest().emitError("not-allowed");

    await expect(stopPromise).rejects.toMatchObject({
      code: "permission-denied",
      retryable: true,
    });
    expect(getLatest().onresult).toBeNull();
  });

  it("maps no-speech errors", async () => {
    const { provider, getLatest } = createProviderWithMock();

    const started = provider.start();
    getLatest().emitStart();
    await started;

    const stopPromise = provider.stop();
    getLatest().emitError("no-speech");

    await expect(stopPromise).rejects.toMatchObject({
      code: "recognition-failed",
      message: expect.stringContaining("No speech"),
    });
  });

  it("maps generic recognition errors", async () => {
    const { provider, getLatest } = createProviderWithMock();

    const started = provider.start();
    getLatest().emitStart();
    await started;

    const stopPromise = provider.stop();
    getLatest().emitError("network");

    await expect(stopPromise).rejects.toMatchObject({
      code: "recognition-failed",
    });
  });

  it("rejects concurrent start calls", async () => {
    const { provider, getLatest } = createProviderWithMock();

    const firstStart = provider.start();
    getLatest().emitStart();
    await firstStart;

    await expect(provider.start()).rejects.toMatchObject({
      code: "recognition-failed",
      message: expect.stringContaining("already active"),
    });
  });

  it("cancellation calls abort and rejects an in-flight stop with aborted", async () => {
    const { provider, getLatest } = createProviderWithMock();

    const started = provider.start();
    getLatest().emitStart();
    await started;

    const stopPromise = provider.stop();
    const abortPromise = provider.abort();

    expect(getLatest().abortCalls).toBe(1);
    getLatest().emitError("aborted");
    getLatest().emitEnd();

    await expect(stopPromise).rejects.toMatchObject({ code: "aborted" });
    await expect(abortPromise).resolves.toBeUndefined();
    expect(getLatest().onend).toBeNull();
  });

  it("ignores late result and error events after cancellation", async () => {
    const { provider, getLatest, instances } = createProviderWithMock();

    const started = provider.start();
    getLatest().emitStart();
    await started;

    const abortPromise = provider.abort();
    getLatest().emitEnd();
    await abortPromise;

    const recognition = getLatest();
    // Handlers are null after cleanup; emitting through retained refs must not throw
    // and must not recreate a session.
    expect(recognition.onresult).toBeNull();
    expect(recognition.onerror).toBeNull();

    recognition.emitFinalResult("late transcript");
    recognition.emitError("network");

    const nextStart = provider.start();
    instances[instances.length - 1]?.emitStart();
    await expect(nextStart).resolves.toBeUndefined();
  });

  it("cleans up event handlers after successful completion", async () => {
    const { provider, getLatest } = createProviderWithMock();

    const started = provider.start();
    const recognition = getLatest();
    recognition.emitStart();
    await started;

    const stopPromise = provider.stop();
    recognition.emitFinalResult("Done");
    recognition.emitEnd();
    await stopPromise;

    expect(recognition.onstart).toBeNull();
    expect(recognition.onresult).toBeNull();
    expect(recognition.onerror).toBeNull();
    expect(recognition.onend).toBeNull();
  });

  it("uses en-US by default and accepts an explicit language", async () => {
    const { provider, getLatest } = createProviderWithMock();

    const started = provider.start();
    expect(getLatest().lang).toBe("en-US");
    getLatest().emitStart();
    await started;

    const abortPromise = provider.abort();
    getLatest().emitEnd();
    await abortPromise;

    const { provider: provider2, getLatest: getLatest2 } = createProviderWithMock();
    const started2 = provider2.start({ language: "en-GB" });
    expect(getLatest2().lang).toBe("en-GB");
    getLatest2().emitStart();
    await started2;
  });

  it("throws VoiceProviderError instances for unsupported browsers", async () => {
    const provider = new BrowserSpeechToTextProvider({
      getConstructor: () => null,
    });

    await expect(provider.start()).rejects.toBeInstanceOf(VoiceProviderError);
  });
});
