# H6.4.4B — rolling calendar contract

- Calendar strip is a **native horizontal scroller**, not a PointerEvent transform carousel. Touching a date can initiate ordinary Safari scrolling, and vertical page scroll remains native.
- Seven visible consecutive civil days are independent of selectedDate; arrows shift the window by one civil day. The existing `Dzisiaj` is the only reset. The selected day and agenda remain unchanged while merely scrolling.
- Renderer has 7+7+7 date cells, centered on the visible seven, with CSS scroll snapping at each cell (`scroll-snap-stop: always`). `scrollend` plus delayed fallback recenters to prevent reaching a fixed end. Date captions derive from actual UTC-noon calendar dates, including month/year and DST boundaries.
- `scheduleQueryRange` uses bounded date pages and cached server occurrences; no local recurrence generation, no SQL changes. Cache invalidates after mutations, re-focus and new Warsaw day.
- Never issue a request earlier than Warsaw today minus seven days. Overdue active tasks remain in the due list despite history retention.
- Completion/Undo remain exclusively Start+Harmonogram RPC-driven, Pomieszczenia edit definitions only, Voice frozen and Food untouched.
- Regression source check does NOT certify gesture on a real iPhone. Required H6.4.4C sign-off: horizontal touch follows finger, tap after swipe, vertical scroll, edge back navigation, screen-reader accessibility, 320–430px layouts, fast sequential scrolls, and GitHub TypeScript/Vite on one SHA.
