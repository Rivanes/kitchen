# Recipe Shared Core Contract — current V3

Recipe ingredients reuse:
- canonical Product resolver/create authority
- shared Product autocomplete
- shared Quantity parser/validation/QuantityStepperInput
- shared Measurement Units

A missing Recipe ingredient creates the same canonical Product used by Inventory and Shopping.

Editing one Recipe ingredient changes Product identity; it must not globally rename the previously referenced Product.

Recipe UI must not expose terms such as `canonical Product` or internal catalog architecture.
