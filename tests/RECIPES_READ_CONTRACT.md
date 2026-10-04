# Recipes Read Contract — V3.2

## Navigation

- `Przepisy` is an active bottom-navigation destination.
- It is not duplicated as a Start/Home module tile.
- Tapping active `Przepisy` while a Recipe detail is open returns to the Recipe list.

## Read model

Owner-scoped reads:
- `recipes`
- `recipe_ingredients`

Ingredient presentation must reuse:
- canonical Product catalog
- shared Measurement Units
- shared Quantity stored-value reader

The read model must not contain insert/update/delete/upsert/RPC mutation behavior.

An unresolved Product or Measurement Unit is a read-model error.
The UI must not create a fallback ingredient identity from free text.

## Recipe list

Required states:
- loading
- error + retry
- empty
- list

Rows show:
- Recipe name
- base servings
- ingredient count

## Recipe detail

Read-only V3.2 detail shows:
- Recipe name
- base servings
- ingredient count
- ordered ingredients
- Product names
- quantity + shared unit symbol
- optional ingredient note
- instructions or a natural missing-instructions state

## Scope boundary

V3.2 must not expose:
- Recipe create
- Recipe edit
- Recipe delete
- ingredient mutations
- servings mutation/scaling
- Recipe matching

Those belong to later V3/V4 stages.
