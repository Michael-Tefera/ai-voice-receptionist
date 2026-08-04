# Phase 2 — Browser Voice Plan

Planning document for optional browser-based voice interaction around the existing Phase 1 conversation core.

**Status:** In progress — Tasks 2.1–2.2 complete. Tasks 2.3+ are not authorized by this status alone.

**Related:** [Implementation Roadmap](IMPLEMENTATION-ROADMAP.md)

---

## 1. Objective

Add optional browser-based voice interaction without changing or coupling the existing `ConversationRuntime`.

Phase 1 flow (unchanged):

```
Browser text input
  → POST /api/conversations/messages
  → ConversationRuntime
  → MockAIProvider
  → optional tool execution
  → assistant text response
```

Target Phase 2 flow:

```
Browser microphone (push-to-talk)
  → browser speech-to-text adapter
  → existing POST /api/conversations/messages
  → existing ConversationRuntime
  → assistant text
  → browser text-to-speech adapter
  → browser audio playback
```

Voice is a presentation/channel layer. The runtime remains text-in / text-out.

---

## 2. Architecture principles

| Principle | Requirement |
|-----------|-------------|
| Channel separation | Voice remains a presentation/channel layer outside `ConversationRuntime` |
| Text preservation | Text mode remains fully functional at all times |
| Stable entry point | Existing `POST /api/conversations/messages` remains the runtime entry point |
| No audio storage | No raw audio is persisted, uploaded, or logged |
| Interaction model | Push-to-talk only |
| No continuous listen | No background or always-on microphone capture |
| No telephony | Phone, SIP, and call bridging are out of Phase 2 |
| No external voice vendor (first slice) | First implementation uses browser-native capabilities where supported |
| Demo continuity | Keep fictional dental-clinic tenant and `MockAIProvider` |

```mermaid
flowchart LR
  Mic[BrowserMic_PTT] --> STT[SpeechToTextProvider]
  STT --> API[POST_conversations_messages]
  API --> Runtime[ConversationRuntime]
  Runtime --> Text[AssistantText]
  Text --> TTS[TextToSpeechProvider]
  TTS --> Speaker[BrowserPlayback]
  Mic -.fallback.-> TextInput[ExistingTextInput]
```

### Relationship to the broader roadmap

[IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md) Phase 2 also mentions demo deployment profile packaging, public rate limiting, and an embeddable widget. **This first Phase 2 slice** deliberately focuses on browser voice on `/demo`. Deployment packaging, rate limiting, and widget work may follow after the voice path works.

---

## 3. Contracts (Task 2.1)

Provider-neutral contracts live in `src/core/voice/types.ts`. Browser capability detection lives in `src/adapters/voice/browser-capabilities.ts`.

**Implemented:** Task 2.1 contracts + capability detection; Task 2.2 `BrowserSpeechToTextProvider`.  
**Not implemented yet:** TTS adapter, microphone permission UX, demo UI voice controls.

### Material detail vs earlier proposal

`VoiceCapability` includes `mediaCapture` (whether `mediaDevices.getUserMedia` exists). Task 2.1 never queries or requests microphone permission, so `microphone` remains `"unknown"`. `supported` is true only when speech recognition, speech synthesis, and media capture APIs are all present.

Task 2.2 STT contract refinements:

- `stop()` returns a trimmed non-empty transcript, or rejects with `VoiceProviderError` / `empty-transcript`
- `abort()` resolves after cleanup; in-flight `stop()` rejects with `aborted`
- Interim results are disabled (`interimResults = false`); `onPartial` is unused in the first adapter
- Browser error mapping: `not-allowed` / `service-not-allowed` → `permission-denied`; `no-speech` → `recognition-failed`; `aborted` → `aborted`; other recognition failures → `recognition-failed`

### `SpeechToTextProvider`

Defined in `src/core/voice/types.ts`. Browser adapter: `src/adapters/voice/browser-speech-to-text.ts` (`BrowserSpeechToTextProvider`).

### `TextToSpeechProvider`

Defined in `src/core/voice/types.ts` (interface only; no adapter in Task 2.1).

### `VoiceCapability`

```ts
interface VoiceCapability {
  speechRecognition: boolean;
  speechSynthesis: boolean;
  mediaCapture: boolean;
  microphone: "unknown" | "granted" | "denied" | "prompt";
  supported: boolean;
}
```

### `VoiceSessionState`

```ts
type VoiceSessionState =
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
```

### `VoiceError`

Defined in `src/core/voice/types.ts` with codes: `unsupported`, `permission-denied`, `recognition-failed`, `empty-transcript`, `api-failed`, `playback-failed`, `aborted`.

`AudioCaptureController` remains deferred to a later task.

---

## 4. State model

### States

| State | Meaning |
|-------|---------|
| `idle` | Ready; mic inactive; text input available |
| `requesting-permission` | Browser permission prompt in progress |
| `listening` | Push-to-talk active; capturing utterance |
| `transcribing` | Finalizing speech recognition result |
| `sending` | Posting transcript to conversation API |
| `waiting-for-response` | Awaiting assistant text from runtime |
| `speaking` | Playing assistant speech via TTS |
| `stopped` | User stopped recording or playback; safe to resume |
| `unsupported` | Browser/capabilities insufficient for voice path |
| `error` | Recoverable or terminal voice-path failure; text still available |

### Allowed transitions

```
idle → requesting-permission → listening → transcribing → sending → waiting-for-response → speaking → idle
idle → listening                         (permission already granted)
idle → unsupported
idle → error
listening → stopped
listening → error
listening → transcribing
transcribing → sending
transcribing → error
transcribing → idle                      (empty transcript → prompt user / stay text-capable)
sending → waiting-for-response
sending → error
waiting-for-response → speaking
waiting-for-response → idle              (TTS unsupported: show text only)
waiting-for-response → error
speaking → idle
speaking → stopped
speaking → error
stopped → idle
error → idle                             (Retry / Continue with text)
unsupported → idle                       (Continue with text; voice controls remain disabled)
* → idle                                 (Reset conversation cancels in-flight voice work)
```

### Invalid transitions (examples)

| Invalid | Why |
|---------|-----|
| `idle → speaking` | Nothing to speak until an assistant reply exists |
| `speaking → listening` | No barge-in / overlap in Phase 2 |
| `sending → listening` | Must finish or abort the current turn first |
| `unsupported → listening` | Capabilities missing |
| `waiting-for-response → listening` | One turn at a time |
| Any state → continuous listen loop | Continuous listening is forbidden |

---

## 5. User experience

| Control / element | Behavior |
|-------------------|----------|
| **Start speaking** | Begins push-to-talk after capability/permission checks |
| **Stop recording** | Ends capture and proceeds to transcription → API |
| **Stop playback** | Cancels TTS immediately; transcript remains |
| **Microphone / listening indicator** | Visible while `listening` (and clearly not active otherwise) |
| **Status text** | Human-readable voice status mapped from `VoiceSessionState` |
| **Text input** | Always available; never blocked by voice feature presence |
| **Retry** | Re-attempt last failed voice step when `retryable` |
| **Continue with text** | Leave voice path; keep session and transcript; focus text input |
| **Reset conversation** | Clears session/transcript and aborts listening/playback |

### Accessibility

- All voice controls are real `<button>` elements with clear labels.
- Status updates use an accessible live region (`aria-live`) without excessive chatter.
- Listening indicator is not color-only; include text (e.g. “Listening…”).
- Keyboard: Start/Stop/Retry/Continue/Reset operable without a pointer.
- Screen readers announce state changes for permission, listening, errors, and playback stop.
- When unsupported, announce that voice is unavailable and text mode remains available.

**Recommended placement:** keep voice controls on `/demo` beside the existing text simulator (not a separate `/voice-demo` route for the first slice).

---

## 6. Browser capability handling

### Detection

- **Speech recognition:** detect `SpeechRecognition` / `webkitSpeechRecognition` (or equivalent browser API) before enabling Start speaking.
- **Speech synthesis:** detect `window.speechSynthesis` and utterance support before auto-play.
- **Microphone permission:** request only on explicit Start speaking; reflect `granted` / `denied` / `prompt` in capability state.

### Unsupported-browser behavior

- Enter `unsupported` (or disable voice with clear status).
- Keep text simulator fully usable.
- Do not show a broken mic control without explanation.

### Known browser-specific limitations (document for implementers)

- Web Speech recognition support varies (Chromium generally stronger; Safari/Firefox support differs by version and OS).
- Recognition quality and language coverage are browser/OS dependent.
- Some browsers require a user gesture to start recognition or playback.
- Synthesis voices and latency vary; there is no guarantee of a consistent “receptionist” voice.
- HTTPS (or localhost) is typically required for microphone access.
- Recognition may be implemented via browser/OS services; Phase 2 still must not upload or persist raw audio in **this application**.

### Fallback to text mode

Fallback triggers:

- speech recognition unavailable
- speech synthesis unavailable (still allow STT → text reply without playback, or disable voice start if STT missing)
- microphone permission denied
- transcription failure / empty transcript
- audio playback failure

In all cases: show status, offer Retry and/or Continue with text, leave text input enabled.

---

## 7. Privacy and safety

| Rule | Detail |
|------|--------|
| Explicit activation | Microphone used only after Start speaking |
| No background listening | No always-on capture; push-to-talk only |
| No audio persistence | Do not save, download, or cache raw audio blobs in app storage |
| No recording uploads | Do not POST audio to the server; only text transcripts use the existing API |
| Transcript storage | Remains the existing in-memory demo conversation store |
| Redacted errors | User-facing errors omit stack traces, raw browser internals, and sensitive details |
| Fictional demo data | Dental-clinic fictional tenant and mock AI only |

---

## 8. Proposed file impact

| Path | Status / purpose |
|------|------------------|
| `src/core/voice/types.ts` | **Added (Task 2.1)** — provider-neutral voice contracts (`VoiceProviderError` for Task 2.2) |
| `src/adapters/voice/browser-capabilities.ts` | **Added (Task 2.1)** — SSR-safe capability detection |
| `src/adapters/voice/browser-capabilities.test.ts` | **Added (Task 2.1)** — capability detection tests |
| `src/adapters/voice/browser-speech-to-text.ts` | **Added (Task 2.2)** — browser-native STT adapter |
| `src/adapters/voice/browser-speech-to-text.test.ts` | **Added (Task 2.2)** — STT adapter tests |
| `src/types/browser-speech-recognition.d.ts` | **Added (Task 2.2)** — minimal SpeechRecognition typings |
| `src/adapters/voice/browser-text-to-speech.ts` | Future — browser-native TTS adapter |
| `src/app/demo/use-voice-session.ts` | Future — demo voice state machine / orchestration hook |
| `src/app/demo/page.tsx` | Future — integrate optional voice controls; preserve text UI |
| `src/app/globals.css` | Future — voice status / indicator styles |
| Additional focused tests under `src/` | Future — state transitions, fallbacks |
| `README.md` | Future — Phase 2 voice demo notes |
| `docs/architecture/CALL-FLOW.md` | Future — document browser voice path |
| `docs/architecture/TARGET-ARCHITECTURE.md` | Future — update voice adapter status |
| `docs/roadmap/IMPLEMENTATION-ROADMAP.md` | Future — mark Phase 2 progress when slice completes |

Unchanged by design in Phase 2 first slice:

- `src/core/runtime/conversation-runtime.ts` (no voice coupling)
- `MockAIProvider` wiring
- In-memory persistence
- Conversation API request/response shape (text only)

---

## 9. Implementation tasks

### Task 2.1 — Contracts and capability detection

**Status: Complete.**

| Field | Detail |
|-------|--------|
| **Objective** | Add voice type contracts and a pure capability-detection helper |
| **Files** | `src/core/voice/types.ts`; `src/adapters/voice/browser-capabilities.ts`; `src/adapters/voice/browser-capabilities.test.ts` |
| **Completion criteria** | Types compile; detection reports recognition/synthesis/media-capture availability without starting capture or requesting permission |
| **Risks** | Over-modeling APIs that differ across browsers |
| **Manual verification** | Unit tests cover SSR, full support, and partial-support hosts |
| **Rollback** | Delete `src/core/voice/` and capability helper/tests; no runtime behavior change (unused by demo UI yet) |

### Task 2.2 — Browser speech-to-text adapter

**Status: Complete.**

| Field | Detail |
|-------|--------|
| **Objective** | Implement push-to-talk STT adapter behind `SpeechToTextProvider` |
| **Files** | `src/adapters/voice/browser-speech-to-text.ts`; `src/adapters/voice/browser-speech-to-text.test.ts`; `src/types/browser-speech-recognition.d.ts`; `src/core/voice/types.ts` (`VoiceProviderError`) |
| **Completion criteria** | Start/stop/abort; trimmed final transcript; empty/permission/no-speech mapped; no audio upload; SSR-safe import |
| **Risks** | Vendor-prefixed APIs; flaky final-result events |
| **Manual verification** | Covered by mocked recognition unit tests (demo UI not wired yet) |
| **Rollback** | Remove STT adapter/tests/typings; restore prior `SpeechToTextProvider` comments if needed |

### Task 2.3 — Browser text-to-speech adapter

| Field | Detail |
|-------|--------|
| **Objective** | Implement TTS adapter behind `TextToSpeechProvider` with stop/cancel |
| **Likely files** | `src/adapters/voice/browser-text-to-speech.ts` + tests |
| **Completion criteria** | Speaks assistant text; `stop()` cancels immediately; `isSpeaking()` accurate |
| **Risks** | Autoplay policies; voice inventory differences |
| **Manual verification** | Play and stop mid-utterance |
| **Rollback** | Remove adapter; demo shows text without speech |

### Task 2.4 — Demo UI integration

| Field | Detail |
|-------|--------|
| **Objective** | Wire voice controls into `/demo` without removing text simulator |
| **Likely files** | `src/app/demo/use-voice-session.ts`, `src/app/demo/page.tsx`, `src/app/globals.css` |
| **Completion criteria** | PTT → API → transcript update → auto TTS; text input still works independently |
| **Risks** | State races between text send and voice send |
| **Manual verification** | Full happy-path voice turn on fictional dental tenant |
| **Rollback** | Revert demo UI/hook changes; restore text-only controls |

### Task 2.5 — Fallback and error handling

| Field | Detail |
|-------|--------|
| **Objective** | Map failures to safe states and user actions (Retry / Continue with text) |
| **Likely files** | `use-voice-session.ts`, demo page copy/status UI |
| **Completion criteria** | Permission denial, unsupported, empty transcript, API failure, playback failure all degrade to text |
| **Risks** | Error loops; unclear status messaging |
| **Manual verification** | Deny mic; disable recognition (or unsupported browser); force API error |
| **Rollback** | Remove fallback branches only if feature flag/guard disables voice entirely |

### Task 2.6 — Tests and documentation closeout

| Field | Detail |
|-------|--------|
| **Objective** | Lock behavior with tests; update public docs to match implementation |
| **Likely files** | Focused Vitest files; README; CALL-FLOW; TARGET-ARCHITECTURE; IMPLEMENTATION-ROADMAP |
| **Completion criteria** | Documented test strategy covered; lint/typecheck/test/build pass; docs consistent |
| **Risks** | Doc drift; brittle browser API mocks |
| **Manual verification** | Run validation suite; walk `/demo` text + voice paths |
| **Rollback** | Revert doc/status claims if feature incomplete |

---

## 10. Testing strategy

| Scenario | Expected result |
|----------|-----------------|
| Supported browser | Voice controls enabled after capability check |
| Unsupported browser | `unsupported` (or disabled controls) + text mode works |
| Permission granted | Transition to `listening` on Start speaking |
| Permission denied | `error` / denied status; Continue with text works |
| Successful transcription | Transcript becomes user message; API called |
| Empty transcription | No misleading send; user prompted; stay text-capable |
| Recognition failure | Safe error; Retry / Continue with text |
| API failure | Safe error; transcript UX does not claim success |
| Speech playback | Assistant text spoken after voice turn |
| Playback cancellation | Stop playback ends audio; text remains |
| Reset during listening | Capture aborted; session/transcript cleared per reset rules |
| Reset during playback | Playback stopped; session/transcript cleared |
| Continued text-mode operation | Typing/sending works with voice idle, unsupported, or after errors |

Prefer Vitest unit/integration tests with mocked browser APIs. Do not add new test-framework dependencies for the first slice unless separately approved.

---

## 11. Decisions requiring approval

Recommended decisions for Phase 2 first implementation (approve before Task 2.1):

| Decision | Recommendation |
|----------|----------------|
| Voice control placement | Keep voice controls on `/demo` |
| Interaction model | Use push-to-talk |
| Playback policy | Automatically play assistant speech after a voice turn |
| Playback control | Provide Stop playback |
| Text availability | Keep text input enabled |
| STT/TTS technology | Use browser-native speech APIs initially |
| Dependencies | Add no external packages initially |
| AI provider | Keep `MockAIProvider` during Phase 2 |
| Persistence | Keep persistence in memory during Phase 2 |

---

## 12. Out of scope

Phase 2 (this slice) does **not** include:

- SIP
- Phone numbers / telephony adapters
- Vapi
- OpenAI Realtime
- External STT/TTS provider SDKs
- Barge-in
- Continuous conversation / always-on listening
- Call transfer
- Call/audio recordings
- PostgreSQL or durable persistence
- Authentication
- Production deployment hardening (rate limiting, public abuse controls, embeddable widget packaging)

---

## Closing

### Recommended first implementation task

**Task 2.1 — contracts and capability detection** (after approval of Section 11 decisions).

### Expected package additions

**None.** Prefer browser-native Web Speech APIs and existing Next.js/React stack only.

### Known browser limitations

- Uneven STT support across browsers and platforms
- TTS voice quality/consistency varies
- Permission and autoplay restrictions
- Recognition may depend on browser/OS services outside app control
- Not a substitute for production telephony or managed voice infrastructure

### Phase 2 completion criteria (first slice)

- Push-to-talk capture on a supported browser produces a transcript
- Transcript uses existing `POST /api/conversations/messages`
- Assistant reply appears in the existing `/demo` transcript UI
- Assistant reply can be spoken via browser TTS with Stop playback
- Text simulator remains fully usable with graceful voice fallbacks
- No raw audio persistence or upload
- No telephony and no external voice SDKs
- Fictional dental tenant + `MockAIProvider` unchanged
- Docs updated to match implemented behavior

### Authorization notice

Tasks 2.1–2.2 were explicitly authorized and completed. This document does **not** authorize Tasks 2.3+, dependency installation, telephony work, TTS adapters, or demo voice UI. Those require a separate explicit instruction.
