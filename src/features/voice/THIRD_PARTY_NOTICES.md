# V6.1A third-party notices

This diagnostic spike uses third-party browser ML software/model artifacts. Keep this file with the Voice implementation when changing runtime/model.

## `@huggingface/transformers`
- pinned package version: `4.3.0`
- project: Hugging Face Transformers.js
- license: Apache-2.0
- purpose: browser-side automatic speech recognition runtime / model loading

## `onnx-community/whisper-tiny`
- pinned revision: `ff4177021cc41f7db950912b73ea4fdf7d01d8e7`
- ONNX conversion intended for Transformers.js
- base model: `openai/whisper-tiny`
- base model card license: Apache-2.0
- purpose: multilingual Whisper Tiny weights used for the V6.1A benchmark

The model is not committed to this repository. The browser downloads the pinned model artifacts on explicit spike use and may cache them locally.

## `Xenova/distiluse-base-multilingual-cased-v2` — V6.1B-RO.2A optional benchmark only
- pinned revision: `cad454171d918d9873a2701ba245054b6c1760dd`
- base model: `sentence-transformers/distiluse-base-multilingual-cased-v2`
- base model card license: Apache-2.0
- purpose: optional multilingual sentence-embedding benchmark for Context Engine evaluation
- runtime: on-demand WASM/q8 through the already pinned Transformers.js runtime

The semantic model is not committed to this repository and is not part of the normal PWA precache. It downloads only after the user explicitly starts the V6.1B-RO.2A semantic benchmark.
