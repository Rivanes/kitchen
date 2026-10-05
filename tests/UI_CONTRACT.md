# Kitchen V0.3 — UI contract

The V0.3 UI foundation must preserve these contracts:

- mobile-first is the primary layout strategy
- light mode is the default
- background is white/off-white rather than the previous dark Foundation skin
- primary form controls are at least 48px high
- form inputs use 16px text to avoid mobile browser zoom behavior
- the app shell includes touch-first navigation
- desktop layout is an adaptive extension of the phone layout
- auth and OwnerGate behavior must not change
- there is no public registration UI
- future module cards are informational only; no Inventory/Shopping/Recipe data model is introduced in V0.3

## SMART UI — permanent invariant

- normal valid state stays visually quiet
- do not repeat context already established by the current module, section or flow
- do not show explanatory cards that merely restate Product role, section or other known state
- helper copy must support a concrete decision/action, not explain implementation
- warnings/conflicts are shown when they require user action
- before adding a persistent label/card/counter, there must be a concrete current-task reason for it

