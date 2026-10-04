# Mobile Density Contract — V2.6.4

## Purchased Shopping rows

At normal phone widths (~360–430 CSS px):
- one purchased item must remain a compact single row
- row columns are: purchased toggle / product copy / quantity-correction action / Inventory action
- `Zmień ilość` must not create a third vertical line under product name and quantity
- product text can ellipsize before action touch targets are sacrificed

At <=359 CSS px:
- quantity correction may render icon-only
- its aria-label remains explicit
- touch target remains >=44px
- no page-level horizontal overflow is allowed

## Shared quantity stepper

All QuantityStepperInput hosts use the same component and CSS authority.
The control is capped at 220px on wide parents and shrinks in narrow parents.
No screen-specific +/- implementation or local spacing hack is allowed.

Required smoke widths:
- 320px
- 360px
- 390/393px
- 430px

Required hosts:
- Inventory add/edit
- Shopping add/edit
- Inventory consume
- purchased Shopping quantity correction
