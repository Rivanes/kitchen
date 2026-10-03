# Shopping Partial Purchase Contract — V2.5.1

Business rule:
planned quantity and actually purchased quantity are not assumed to be equal.

The system must support:
`4 szt. planned -> 3 szt. purchased -> 1 szt. still active`.

One operation authority:
- UI: ShoppingPurchaseSheet
- Quantity control: shared QuantityStepperInput
- mutation: purchaseShoppingQuantity
- DB authority: public.purchase_shopping_item

Undo authority:
- mutation: restoreShoppingPurchase
- DB authority: public.restore_shopping_purchase

No client-side UPDATE+INSERT split is allowed for partial purchase.
The database RPC owns the transaction atomically.
