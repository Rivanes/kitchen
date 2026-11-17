/**
 * Shared source-level fail-closed boundary assertion for Kitchen authentication.
 * Keep this independent of additional presentation props (e.g. PWA install),
 * while requiring the keyed membership gate between Auth and HomeHubShell.
 */
export function assertKeyedMembershipGate(source) {
  const signedOutGuard = /if\s*\(\s*!session\?\.user\s*\)/.exec(source)
  const gateReturn = /\breturn\s*<MembershipGate\b([\s\S]*?)\/>/.exec(source)
  if (!signedOutGuard || !gateReturn || signedOutGuard.index >= gateReturn.index) {
    throw new Error('Authenticated sessions must pass through keyed MembershipGate after the signed-out guard.')
  }

  const props = gateReturn[1]
  for (const [name, expression] of [
    ['key', 'session.user.id'],
    ['user', 'session.user'],
    ['adminRoute', 'adminRoute'],
    ['onNavigateAdmin', 'navigateAdmin'],
  ]) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const prop = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*\\{\\s*${expression.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}`)
    if (!prop.test(props)) {
      throw new Error(`MembershipGate is missing required ${name}={${expression}} binding.`)
    }
  }

  // App must not render a home shell around the membership gate.
  if (/<(?:AppShell|HomeHubShell)\b/.test(source)) {
    throw new Error('App must not render AppShell or HomeHubShell outside MembershipGate.')
  }
}
