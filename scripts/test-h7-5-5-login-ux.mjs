import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [login, update, css, gate, invite, contract] = await Promise.all([
  readFile('src/components/LoginPage.tsx', 'utf8'),
  readFile('src/features/pwa/PwaUpdateNotice.tsx', 'utf8'),
  readFile('src/styles/global.css', 'utf8'),
  readFile('src/components/MembershipGate.tsx', 'utf8'),
  readFile('src/components/InvitationPage.tsx', 'utf8'),
  readFile('tests/H7_5_5_LOGIN_UPDATE_UX_CONTRACT.md', 'utf8'),
])

function assertLoginUX(source) {
  assert.match(source, /className="auth-layout login-layout"/)
  assert.match(source, /className="login-card login-entry"/)
  assert.match(source, /className="login-brand-wordmark">Kitchen</)
  assert.match(source, /<h1 id="login-title">Witaj ponownie<\/h1>/)
  assert.doesNotMatch(source, /Prywatny dostęp|Twoja domowa kuchnia w jednym miejscu|Zaloguj się, aby przejść|Dostęp tylko dla zaproszonych użytkowników/,
    'Login must not repeat context or invisible access rules')
  assert.doesNotMatch(source, /className="soft-icon"|className="login-footnote"|className="login-intro"/)
  assert.match(source, /supabase\.auth\.signInWithPassword\(/)
  assert.match(source, /onSubmit=\{handleSubmit\}/)
  assert.match(source, /type="email"/)
  assert.match(source, /type="password"/)
  assert.match(source, /autoComplete="email"/)
  assert.match(source, /autoComplete="current-password"/)
  assert.match(source, /configurationMissing \|\| loading/)
  assert.match(source, /role="alert"/)
  assert.doesNotMatch(source, /\.signUp\(|Utwórz konto|Zarejestruj/)
}

function assertUpdateUX(source) {
  assert.match(source, /if \(!needRefresh\) return null/)
  assert.match(source, /role="status" aria-label="Aktualizacja Kitchen"/)
  assert.match(source, /Dostępna aktualizacja/)
  assert.match(source, /updateServiceWorker\(true\)/)
  assert.doesNotMatch(source, /Nowa wersja Kitchen jest gotowa|nie edytujesz formularza|Zaktualizuj ją teraz/,
    'Update notice must stay concise and actionable')
  assert.equal((source.match(/<p>/g) ?? []).length, 1, 'Only one status line should be rendered')
}

assertLoginUX(login)
assertUpdateUX(update)
assert.throws(() => assertLoginUX(login.replace(
  '<h1 id="login-title">Witaj ponownie</h1>',
  '<h1 id="login-title">Witaj ponownie</h1><p className="login-intro">Zaloguj się, aby przejść do zapasów</p>'
)), /Login must not repeat context/)
assert.throws(() => assertUpdateUX(update.replace(
  'Dostępna aktualizacja', 'Nowa wersja Kitchen jest gotowa'
)), /Dostępna aktualizacja/)
assert.match(css, /\.login-entry\s*\{/)
assert.match(css, /\.login-layout\s*\{/)
assert.match(css, /\.login-entry \.login-form input\s*\{/)
assert.doesNotMatch(css, /\.soft-icon\s*\{/)
assert.match(css, /\.pwa-update-notice p\s*\{[^}]*margin:\s*0/)
assert.doesNotMatch(css, /\.pwa-update-notice\s*\{\s*align-items:\s*stretch/)
assert.match(gate, /kitchen_my_access/)
assert.match(invite, /login-card/)
assert.match(contract, /H7.5.5/)

console.log('H7.5.5 login and update notice UX contract: PASS')
