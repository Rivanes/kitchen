# Voice Local STT Spike Contract — V6.1A

## Scope

V6.1A is a **diagnostic-only local speech-to-text spike**. It proves microphone capture, local Whisper inference, model cache behavior and phone performance before Voice is allowed to call any Kitchen business authority.

The diagnostic surface is available only through the explicit query flag:

`?voice-spike=1`

Normal Kitchen navigation must not expose Voice yet.

## Runtime boundary

`LocalSpeechToTextAdapter` is the provider-neutral boundary. The current candidate is `TransformersLocalSttAdapter`, which owns a dedicated Worker. React UI must not import `@huggingface/transformers` directly.

Pinned candidate:

- runtime: `@huggingface/transformers` **4.3.0**;
- model: `onnx-community/whisper-tiny`;
- model revision: `ff4177021cc41f7db950912b73ea4fdf7d01d8e7`;
- language: Polish;
- task: transcription.

WASM/q8 is the compatibility baseline. WebGPU/fp16 is an optional benchmark only when `navigator.gpu` exists.

## Privacy + authority boundary

V6.1A must have **zero Kitchen business mutations**.

The Voice spike must not import or call:

- Supabase client;
- Product mutation authorities;
- Inventory mutation authorities;
- Shopping mutation authorities;
- Recipe mutation authorities;
- Edge Functions or remote speech APIs.

Audio exists only in memory long enough to resample to 16 kHz and transcribe. Raw audio must not be persisted in localStorage, IndexedDB, Supabase Storage or any application table.

Only diagnostic metadata and exact transcript text may be stored locally for QA.

## Microphone contract

- permission request happens only after explicit user action;
- capture uses `getUserMedia()` + `AudioWorklet`;
- input is mono voice audio;
- captured PCM is resampled to 16 kHz before Whisper;
- one command is capped at 10 seconds;
- microphone tracks are stopped immediately after stop/cancel;
- silent/near-empty samples fail without invoking STT.

## Model delivery + cache

The Whisper model is on-demand. It must not be bundled into the repository or normal Kitchen PWA precache.

Transformers.js browser cache and its V4 WASM runtime cache are enabled. The diagnostic UI reports cache hit/miss, download progress, model initialization time and browser storage delta.

`vite-plugin-pwa` must explicitly keep the ML worker/WASM runtime out of the ordinary PWA precache path. This prevents a normal Kitchen visit from becoming a hidden Voice model/runtime download.

## QA output

Each successful run records, without raw audio:

- exact expected test phrase;
- exact model transcript;
- backend;
- model id/revision;
- model load time;
- inference time;
- audio duration;
- source sample rate;
- 16 kHz sample count;
- storage before/after;
- user agent;
- WebGPU capability.

The eight Polish corpus phrases from the PRE-V6.1 audit must remain available in the diagnostic UI.

## PASS gate

V6.1A is not PASS until the real target phone proves:

1. production Pages loads the model;
2. model download progress is visible;
3. warm run reuses browser cache;
4. microphone permission is user-initiated;
5. 3–10 second Polish phrases transcribe locally;
6. UI remains responsive during inference;
7. no crash/tab reload;
8. normal Kitchen PWA still works;
9. exact transcripts + metrics are exported for review.

Only then may V6.1B production Voice UI be selected and built.
