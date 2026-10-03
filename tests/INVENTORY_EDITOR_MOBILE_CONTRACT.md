# Inventory Editor Mobile Contract — V1.6.1

The add/edit sheet is a phone-first surface.

## Layout
- the sheet is bounded by the dynamic mobile viewport
- internal scrolling is fallback, not the default composition
- quantity + unit stay on one row on narrow phones
- expiry + clear action stay on one compact row
- clear-expiry is icon-sized rather than another full-width text row
- edit consume/remove actions stay compact and reachable

## Keyboard
- mobile/coarse-pointer devices do not auto-focus on sheet open
- the software keyboard therefore appears only after the user taps a field
- fine-pointer desktop may retain autofocus convenience

## Accessibility
- clear-expiry has an explicit accessible label
- compact stock actions retain explicit labels
- touch targets remain approximately 44–48px or larger

## Security/data
Presentation-only corrective.
Auth, OwnerGate, owner_id, RLS, expiry persistence and Inventory mutation semantics remain unchanged.
