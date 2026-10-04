# Inventory Editor Mobile Contract — V1.6.1 + V3.6B

The add/edit sheet is a **phone-first** surface. Desktop keyboard behavior is secondary convenience only.

## Layout
- the sheet is bounded by the dynamic mobile viewport
- internal scrolling is fallback, not the default composition
- quantity + row unit stay on one row on normal narrow phones
- expiry + clear action stay on one compact row
- clear-expiry is icon-sized rather than another full-width text row
- edit consume/remove actions stay compact and reachable
- for container stock, package-content value + content unit form one compact semantic block
- package-content controls may collapse to one column only on exceptionally narrow phones
- Product-wide settings remain visually separate from physical-lot fields

## Touch interaction
- primary close/cancel/save controls are visible and touch-reachable
- package content is editable without hover, keyboard shortcuts or desktop-only affordances
- Product settings use an explicit touch target
- touch targets remain approximately 44–48px or larger

## Keyboard
- mobile/coarse-pointer devices do not auto-focus on sheet open
- the software keyboard therefore appears only after the user taps a field
- fine-pointer desktop may retain autofocus convenience
- Escape may remain a desktop fallback but is never the primary close interaction

## Accessibility
- clear-expiry has an explicit accessible label
- compact stock actions retain explicit labels
- Product-settings trigger has an explicit accessible label
- semantic fields retain visible labels

## Security/data
V3.6B adds package-content persistence but does not relax Auth, OwnerGate, owner_id or RLS. The Inventory-lot package-content snapshot remains the physical-lot authority.
