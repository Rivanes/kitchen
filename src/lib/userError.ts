export function toUserErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback

  const message = error.message.trim()
  if (!message) return fallback

  // Mutation functions intentionally prefix backend failures with a Polish
  // action-level message. UI should keep that useful context but must not
  // expose raw Postgres/Supabase details after the separator.
  const wrappedBackendFailure = message.match(/^(Nie udało się [^:]+):\s+.+$/s)
  if (wrappedBackendFailure) {
    return `${wrappedBackendFailure[1]}.`
  }

  return message
}
