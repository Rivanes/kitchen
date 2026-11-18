import { readFile, stat } from 'node:fs/promises'
import { strict as assert } from 'node:assert'
const text = (path) => readFile(path, 'utf8')
const [vite, main, app, hub, panel, lifecycle, update, network, membership, index, css] = await Promise.all([
  text('vite.config.ts'), text('src/main.tsx'), text('src/App.tsx'),
  text('src/components/HomeHubShell.tsx'), text('src/features/pwa/PwaInstallPanel.tsx'),
  text('src/features/pwa/usePwaInstall.ts'), text('src/features/pwa/PwaUpdateNotice.tsx'),
  text('src/features/pwa/NetworkStatus.tsx'), text('src/components/MembershipGate.tsx'), text('index.html'),
  text('src/styles/global.css'),
])
assert.match(vite, /registerType:\s*'prompt'/)
assert.doesNotMatch(vite, /registerType:\s*'autoUpdate'/)
assert.match(vite, /runtimeCaching:\s*\[\s*\]/)
assert.match(vite, /globIgnores/)
assert.match(vite, /display:\s*'standalone'/)
assert.match(vite, /start_url:\s*'\/kitchen\/'/)
assert.match(main, /<NetworkStatus \/>/)
assert.doesNotMatch(main, /registerSW\(/)
assert.match(app, /useRegisterSW\(/)
assert.match(app, /usePwaInstall\(/)
assert.match(membership, /needPwaRefresh=\{needPwaRefresh\}/)
assert.match(hub, /<PwaInstallPanel install=\{install\}/)
assert.match(hub, /<PwaUpdateNotice needRefresh=\{needPwaRefresh\}/)
assert.ok(hub.indexOf("if (module === 'food')") < hub.indexOf('<PwaUpdateNotice'))
assert.ok(hub.indexOf("if (module === 'cleaning')") < hub.indexOf('<PwaUpdateNotice'))
assert.match(lifecycle, /beforeinstallprompt/)
assert.match(lifecycle, /appinstalled/)
assert.match(lifecycle, /display-mode: standalone/)
assert.match(lifecycle, /navigator.*standalone/)
assert.match(panel, /Dodaj do ekranu początkowego/)
assert.match(panel, /install\.canPrompt/)
// H7.5.4: one discreet installation action follows both module cards, in page flow.
function assertInstallPlacement(source) {
  const headerEnd = source.indexOf('</header>', source.indexOf('return ('))
  const mainStart = source.indexOf('<section className="home-hub-main"')
  const moduleTiles = source.indexOf('<div className="home-hub-modules"')
  const tilesEnd = source.indexOf('</div>', moduleTiles)
  const installEntry = source.indexOf('<PwaInstallPanel install={install} />')
  const updateEntry = source.indexOf('<PwaUpdateNotice needRefresh={needPwaRefresh}')
  assert.equal(source.split('<PwaInstallPanel install={install} />').length - 1, 1,
    'Home must have exactly one installation entry')
  assert.ok(headerEnd >= 0 && mainStart > headerEnd && moduleTiles > mainStart &&
    tilesEnd > moduleTiles && installEntry > tilesEnd && updateEntry > installEntry,
  'PWA entry must follow the two Home tiles, inside Home main, before update notice')
}
assertInstallPlacement(hub)
assert.throws(() => assertInstallPlacement(
  hub.replace('        <PwaInstallPanel install={install} />', '')
    .replace('</header>', '</header>\n<PwaInstallPanel install={install} />')),
  /PWA entry must follow/, 'Legacy header placement must fail')

function assertStandaloneInstallUX(source) {
  assert.match(source, /if\s*\(\s*install\.runningStandalone\s*\)\s*return\s+null/,
    'Standalone mode must not render installation help')
  assert.doesNotMatch(source, /Kitchen jest zainstalowany|Kitchen jako aplikacja/,
    'Redundant installed status must not return')
  assert.doesNotMatch(source, /install\.installed/,
    'Do not couple the panel to an ambiguous installed flag')
}
assertStandaloneInstallUX(panel)
assert.throws(() => assertStandaloneInstallUX(panel.replace(
  'if (install.runningStandalone) return null', '')), /Standalone mode must not render/)
assert.throws(() => assertStandaloneInstallUX(panel.replace(
  '<span>Zainstaluj Kitchen</span>', '<span>Kitchen jest zainstalowany</span>')),
  /Redundant installed status/)
assert.match(panel, /Zainstaluj Kitchen/)
assert.match(panel, /iPhone \/ iPad/)
assert.match(panel, /Android \/ inne urządzenia/)
assert.match(panel, /w Safari/)
assert.match(lifecycle, /runningStandalone/)
assert.match(lifecycle, /setRunningStandalone\(isStandaloneApp\(\)\)/)
assert.doesNotMatch(lifecycle, /setInstalled\(|\[installed,\s*setInstalled\]/,
  'Installing the app is distinct from running this tab standalone')
assert.match(lifecycle, /const onInstalled = \(\) => \{\s*setPromptEvent\(null\)/,
  'appinstalled should expire the native prompt, not hide help in the browser')
assert.doesNotMatch(panel, /install\.ios|navigator\.userAgent/,
  'Browser identification must not control help visibility')
assert.doesNotMatch(lifecycle, /detectIos|navigator\.userAgent/,
  'PWA install hook should use capability detection instead of UA sniffing')
assert.match(lifecycle, /typeof window\.matchMedia/)
assert.match(lifecycle, /mode\.addListener/)
assert.match(lifecycle, /pageshow/)
assert.doesNotMatch(hub + css, /pwa-home-install-access/,
  'Remove the obsolete install area and its positioning styles')
assert.match(css, /\.pwa-hub-help\s*\{[^}]*align-items:\s*center/,
  'The entry should align with the module cards instead of the header action')
assert.match(css, /justify-content:\s*safe center/,
  'On short displays the main flow must remain scrollable without negative overflow')

assert.match(update, /updateServiceWorker\(true\)/)
assert.match(network, /Brak połączenia z internetem/)
assert.doesNotMatch(network+panel+update, /localStorage|sessionStorage|supabase|fetch\(/i)
assert.match(index, /apple-touch-icon/)
assert.equal((await stat('public/icons/kitchen-180.png')).isFile(), true)
console.log('H7.5 PWA static lifecycle contract: PASS')
