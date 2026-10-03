import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'

const requiredFiles = [
  '.env.example',
  '.github/workflows/qa.yml',
  '.github/workflows/deploy.yml',
  'src/App.tsx',
  'src/components/LoginPage.tsx',
  'src/lib/supabase/client.ts',
  'vite.config.ts',
]

for (const file of requiredFiles) {
  await access(file, constants.R_OK)
}

const envExample = await readFile('.env.example', 'utf8')
const expectedEnv = 'VITE_SUPABASE_URL=\nVITE_SUPABASE_PUBLISHABLE_KEY=\n'
if (envExample.replace(/\r\n/g, '\n') !== expectedEnv) {
  throw new Error('.env.example must contain only the two empty public Vite variables.')
}

const loginPage = await readFile('src/components/LoginPage.tsx', 'utf8')
if (/signUp\s*\(/.test(loginPage) || />\s*(Zarejestruj|Utwórz konto)\s*</i.test(loginPage)) {
  throw new Error('Public sign-up logic or UI was detected in LoginPage.tsx.')
}

const client = await readFile('src/lib/supabase/client.ts', 'utf8')
if (!client.includes('VITE_SUPABASE_URL') || !client.includes('VITE_SUPABASE_PUBLISHABLE_KEY')) {
  throw new Error('Supabase client is not using the approved public Vite variables.')
}
if (/service_role|SUPABASE_SECRET|DATABASE_PASSWORD/i.test(client)) {
  throw new Error('Forbidden server/admin credential reference detected in browser client.')
}

const viteConfig = await readFile('vite.config.ts', 'utf8')
if (!viteConfig.includes("base: '/kitchen/'")) {
  throw new Error("GitHub Pages base path must stay '/kitchen/'.")
}

console.log('Kitchen project contract verification: PASS')
