import { readFile, stat } from 'node:fs/promises'
import { strict as assert } from 'node:assert'
const text = (path) => readFile(path, 'utf8')
const [vite, main, app, hub, panel, lifecycle, update, network, membership, index] = await Promise.all([
  text('vite.config.ts'), text('src/main.tsx'), text('src/App.tsx'),
  text('src/components/HomeHubShell.tsx'), text('src/features/pwa/PwaInstallPanel.tsx'),
  text('src/features/pwa/usePwaInstall.ts'), text('src/features/pwa/PwaUpdateNotice.tsx'),
  text('src/features/pwa/NetworkStatus.tsx'), text('src/components/MembershipGate.tsx'), text('index.html'),
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
assert.match(update, /updateServiceWorker\(true\)/)
assert.match(network, /Brak połączenia z internetem/)
assert.doesNotMatch(network+panel+update, /localStorage|sessionStorage|supabase|fetch\(/i)
assert.match(index, /apple-touch-icon/)
assert.equal((await stat('public/icons/kitchen-180.png')).isFile(), true)
console.log('H7.5 PWA static lifecycle contract: PASS')
