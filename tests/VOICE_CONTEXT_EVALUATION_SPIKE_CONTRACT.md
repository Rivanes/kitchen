# Voice Context Evaluation Spike Contract — V6.1B-RO.2A

Status: diagnostic only / no production integration.

## Purpose
V6.1B-RO.2A evaluates whether Kitchen can recover read-only meaning from noisy Polish STT with a small contextual layer before any Context Engine becomes production authority.

## Frozen boundaries
- no business writes;
- no Product / Inventory / Shopping / Recipe mutation imports;
- no SQL/schema/RLS/Auth/Storage changes;
- normal Kitchen Voice remains on the accepted V6.1B-RO.1 read-only flow;
- raw transcript remains evidence and is never silently replaced;
- dynamic entities must resolve only to live/corpus candidate IDs;
- ambiguous entity candidates clarify instead of silently choosing;
- unknown / out-of-domain and write-shaped utterances remain rejectable;
- semantic benchmark is on-demand only and must not become PWA precache;
- semantic model choice is not production-locked by this stage.

## Candidates
The same held-out corpus compares:
1. current literal parser baseline;
2. tiny hashed character/subword linear classifier trained only on the separate training corpus;
3. lexical + general phonetic + context entity resolver;
4. optional DistilUSE multilingual q8 semantic embedding benchmark.

## Required evidence
- held-out accuracy and per-category rows;
- actual `I lebałam rzeczy na liście.` real phone case;
- write-shaped V6.1A STT failures rejected by the read-only intent layer;
- Lasagne pronunciation variants recovered without a manual `word = word` alias table;
- ambiguous similar recipes produce clarification;
- context sequences carry active recipe/product/shopping topic correctly;
- local init/query latency;
- optional semantic model load size/time/storage and warm-cache rerun on a real phone;
- exported JSON from the deployed phone spike.

## QA #101 compiler regression (V6.1B-RO.2A corrective)
- `VOICE_CONTEXT_EVALUATION_SEQUENCES` is a TypeScript union: `shopping-followup` intentionally has no `initial.entity`, while Product/Recipe sequences do.
- The runner must narrow using `'entity' in sequence.initial` before reading the entity kind/ID. Optional chaining by itself does not make a missing union property legal.
- `scripts/test-voice-context-evaluation.mjs` guards the source contract. The authoritative typecheck is `npm run typecheck` in GitHub Actions.
- Keep every original fixture unchanged; do not turn a missing entity into a fabricated placeholder.

## PASS gate
Static/local tests can establish deterministic corpus behavior only. Real phone evidence is mandatory before selecting a production Context Engine candidate. No production integration is authorized by this contract.
