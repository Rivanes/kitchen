# Shopping Purchased Quantity Correction Contract — V2.6.3

Business rule:
planned quantity and actually purchased quantity are not assumed to be equal, but the common full purchase must remain one tap.

Canonical flow:
`4 planned -> tap purchased -> 4 purchased -> correct to 3 -> 3 purchased + 1 active`.

One correction authority:
- UI: `ShoppingPurchaseSheet` opened from an already-purchased row
- quantity control: shared `QuantityStepperInput`
- mutation: `adjustPurchasedShoppingQuantity()`
- DB authority: `public.adjust_purchased_shopping_quantity(...)`

The active row must not show a pre-purchase `Zmień ilość` action for this use case.
No client-side UPDATE + INSERT split is allowed; the database owns the correction atomically.
