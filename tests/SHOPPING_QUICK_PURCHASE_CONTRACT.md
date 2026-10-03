# Shopping Quick Purchase Contract — V2.6.3

## Fast path
- Tapping the active-row purchase check means `buy the full currently requested quantity`.
- It calls the existing `purchaseShoppingQuantity()` authority directly with `item.quantity`.
- It must not open a confirmation/quantity sheet.

## Correction path — only after purchase
- `Zmień ilość` is shown on the row in the `Kupione` section, not on the active row.
- It opens the shared `ShoppingPurchaseSheet`, now acting as the purchased-quantity correction sheet.
- Example: active 4 -> tap check -> purchased 4 -> `Zmień ilość` -> set 3 -> purchased 3 + active remainder 1.
- The correction is one atomic DB operation through `adjust_purchased_shopping_quantity(...)`.
- Reducing purchased quantity returns the difference to the active list.
- Increasing purchased quantity may consume an equivalent active remainder; it must fail closed if the remainder is unavailable.

## Existing edit path
- Opening the active Shopping row still edits the planned list item itself.
- Editing the planned row is separate from correcting what was actually purchased.
