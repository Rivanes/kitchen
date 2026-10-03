# Inventory Browse Contract — V1.3.2

V1.3.2 refines browsing without changing the Inventory schema or mutation authority.

Required behavior:

- Storage locations remain the primary browse structure.
- Every owner location is visible as a compact location row/card, including an empty location.
- Product rows are not rendered until the user expands a populated location.
- A populated location can be expanded/collapsed by touch.
- The location header shows its stock-row count without duplicating a global three-counter summary.
- Empty locations remain visible but do not expand into redundant empty content.
- When Inventory has at least 8 stock rows, local product search appears automatically.
- Search is intentionally hidden for small inventories to avoid unnecessary UI noise.
- Active search filters across locations and expands matching groups so results are immediately visible.
- Product-row click still opens V1.3 edit; V1.3.2 does not add delete/consume/expiry semantics.
- Start remains a SMART dashboard rather than a duplicate module navigator.
- Start may preview future contextual capabilities as compact disabled/informational cards.
