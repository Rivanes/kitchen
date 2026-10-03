# Inventory Consume / Remove Contract — V1.4

V1.4 adds depletion/removal without changing the V1.1 schema.

Required behavior:

- consume is available only for an existing Inventory lot
- consume quantity must be > 0 and may use at most 3 decimal places
- consuming more than the current lot quantity is rejected
- partial consume updates the existing lot to the positive remainder
- consuming the exact remaining quantity deletes the lot; quantity zero is never persisted
- `Zużyj wszystko` is an explicit full-depletion action and deletes the current owner-scoped lot directly, so stale visible quantity cannot leave an unintended remainder
- explicit `Usuń z zapasów` requires confirmation
- removal deletes only `inventory_items`; the canonical Product is retained for future reuse
- every mutation is scoped by `owner_id`
- existing database RLS remains authoritative
- no SQL/schema delta is required because V1.1 already granted owner-scoped UPDATE/DELETE on `inventory_items`
- expiry semantics remain out of scope until V1.6
- package-content normalization remains future work before Recipe Matching
