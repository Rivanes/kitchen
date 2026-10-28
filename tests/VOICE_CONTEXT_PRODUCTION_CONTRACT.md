# V6.1B-RO.2B — Kitchen Context Engine read-only integration

## Read-only scope and authority

- Normal Kitchen Voice now consumes one shared Context Engine, also used by the diagnostic spike.
- Read-only only; no business writes, no Supabase query or mutation authority import from Voice.
- Intent/entity resolution happens in the Context Engine; Product/Recipe/Location results use an existing canonical ID from the current Kitchen read snapshot.
- Quantity, shopping content, Recipe availability and Recipe instructions remain handled by `voiceReadOnlyAssistant.ts` and the existing Recipe matcher.
- No model weights, semantic benchmark or diagnostic evaluation fixtures are loaded in normal Voice. Only the tiny local classifier training examples are bundled.
- STT raw transcript is preserved; a separate interpreted summary is displayed after accepted interpretation.

## Confidence and abstention

- Accepted read-only answer requires interpretation decision=answer and confidence >= 0.68.
- Lower confidence, missing/ambiguous entities, or invalid current ID => explicit clarification or repetition; never guess a Product/Recipe ID.
- Obvious write-shaped utterances are refused even if the classifier predicts a read intent.
- Short uncertain Recipe names can yield a clickable confirmation but cannot silently execute an ambiguous read. Clicking a choice binds its canonical ID directly, never re-runs an ambiguous name resolver, and validates the ID in the current read snapshot.
- Topic/entity/location conversation memory is bounded to one assistant session, and changes only on accepted read results. Refresh clears it.
- Speech output stays on the existing TTS adapter; this stage does not claim to fix sporadic iOS speech availability.

## Required QA

- Run contract tests, project verifier, GitHub typecheck and Pages build.
- On a real phone verify noisy Shopping/Location/Recipe phrases, open Recipe action, explicit ambiguity, write refusal and context follow-ups.
- Compare canonical ID and answer against real Kitchen data, not synthetic/demo data.
- Keep V6.1A final STT model-selection gate open until independently accepted.

Status: ready for GitHub QA and real phone, **not PASS/CLOSED**.
