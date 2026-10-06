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
