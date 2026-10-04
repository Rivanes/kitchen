# Shopping Overpurchase Contract — V2.6.5

## Business rule

The Shopping list is a plan.
A purchased row is a record of what was actually bought.
Actual purchased quantity may be higher than the amount that was planned.

## Increasing a purchased quantity

Given:
- purchased quantity = P
- equivalent active remainder = A (possibly zero / absent)
- requested corrected purchased quantity = N, where N > P

Then:
- delta = N - P
- consume `min(A, delta)` from the equivalent active remainder
- never let the active remainder become negative
- store the purchased quantity as exactly N
- any part of delta beyond A is valid overpurchase, not an error

Canonical example:
`3 purchased + 1 active -> correct purchased to 5 -> 5 purchased + 0 active`.

Also valid:
`3 purchased + no active row -> correct purchased to 5 -> 5 purchased`.

## Decreasing a purchased quantity

If N < P:
- delta = P - N
- purchased becomes N
- delta is returned to / merged into an equivalent active row

## Authority

Exactly one database authority owns this correction:
`public.adjust_purchased_shopping_quantity(...)`

The frontend must not reproduce remainder arithmetic.
The operation remains owner-scoped, SECURITY INVOKER and atomic.
