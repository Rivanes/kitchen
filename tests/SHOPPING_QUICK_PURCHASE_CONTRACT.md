# Shopping Quick Purchase Contract — V2.6.2

## Fast path
- Tapping the active-row purchase check means `buy the full currently requested quantity`.
- It calls the existing `purchaseShoppingQuantity()` authority directly with `item.quantity`.
- It must not open a confirmation sheet for the common full-quantity case.

## Partial path
- Every active Shopping row exposes a separate visible `Zmień ilość` action.
- That action opens the existing `ShoppingPurchaseSheet`.
- The sheet continues to own partial purchase semantics, e.g. planned 4 -> bought 3 -> active remainder 1.
- No second partial-purchase mutation or dialog is introduced.

## Existing edit path
- Opening the Shopping row still edits the list item itself.
- Quick purchase and partial purchase are distinct from editing the planned Shopping item.
