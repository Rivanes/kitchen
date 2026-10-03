# Shared Product Autocomplete Contract — V2.3.1

Kitchen must use one Product suggestion system anywhere the user enters a Product identity.

## Shared authority

The shared Product identity/autocomplete layer owns:
- Polish case-insensitive name normalization
- whitespace normalization
- exact canonical Product matching
- substring suggestion matching
- maximum of 5 suggestions
- the reusable suggestion UI

Inventory and Shopping must not maintain independent autocomplete implementations.

## Inventory create

- Typing a canonical Product name resolves the existing Product.
- Suggestions use the shared component.
- Choosing a suggestion fills the canonical Product name and its default unit.
- A non-matching name remains eligible to create a new canonical Product.

## Shopping create/edit

- Suggestions use the same shared component and matching rules as Inventory.
- Choosing a suggestion resolves a concrete canonical Product id and its default unit.
- Typing an exact canonical Product name also resolves the same Product identity.
- A non-matching name remains an ad-hoc Shopping `custom_name`; Shopping does not create a Product implicitly.
- Mutation code re-validates the selected/exact Product against the owner-scoped Product catalog before persistence.

## Future reuse

Inventory -> Shopping and future Recipe/Product entry flows should consume this shared Product autocomplete rather than creating another suggestion system.

## No database delta

V2.3.1 changes frontend/shared logic only. V2.2 remains the Shopping schema/RLS authority.
