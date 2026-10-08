# Kitchen Voice read-only foundation contract

This stage is a **read-only** production-shaped Voice foundation.

Permanent requirements:
- no business mutation from the Voice read-only layer;
- no direct Supabase query in Voice orchestration/NLU files;
- current Kitchen data is obtained through existing read models;
- Product, Inventory, Shopping and Recipe identities remain canonical;
- recipe availability reuses the existing Recipe matching authority;
- quantity aggregation reuses the shared Quantity authority;
- the normal Kitchen UI is unchanged until the floating microphone is opened;
- the assistant appears as a bottom sheet and does not navigate to the V6.1A diagnostic cockpit;
- exact STT transcript remains visible to the user;
- typed input is available so NLU/read-query QA is independent of STT quality;
- raw audio is kept in memory only and is not persisted;
- model loading remains on demand;
- STT is accessed through one STT provider boundary so the V6.1A winner can replace the temporary candidate without rewriting read-only Kitchen logic;
- spoken output uses a provider-neutral SpeechOutputAdapter;
- recipe navigation is read-only and may open the existing Recipes detail flow;
- no Voice -> Shopping/Inventory/Product/Recipe write is allowed in this stage.
