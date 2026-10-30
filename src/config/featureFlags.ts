/**
 * Kitchen feature gates. The Voice/NLU research is frozen, not deleted.
 * Keep this as a compile-time constant: no localStorage, URL or remote override.
 * Reactivation requires a deliberate source change and fresh regression QA.
 */
export const KITCHEN_VOICE_ENABLED = false
