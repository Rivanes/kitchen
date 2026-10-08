import { lazy, Suspense, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { HomePage } from '../features/home/HomePage'
import { ExpiryPage } from '../features/inventory/ExpiryPage'
import { InventoryPage } from '../features/inventory/InventoryPage'
import { ShoppingPage } from '../features/shopping/ShoppingPage'
import { RecipesPage } from '../features/recipes/RecipesPage'
import { KitchenIcon } from './KitchenIcon'

const VoiceSttSpikePage = lazy(() => import('../features/voice/VoiceSttSpikePage').then((module) => ({ default: module.VoiceSttSpikePage })))
const VoiceAssistantSheet = lazy(() => import('../features/voice/VoiceAssistantSheet').then((module) => ({ default: module.VoiceAssistantSheet })))

type AppShellProps = {
  user: User
}

type AppView = 'home' | 'inventory' | 'expiry' | 'shopping' | 'recipes'

export function AppShell({ user }: AppShellProps) {
  const voiceSpikeMode = new URLSearchParams(window.location.search).get('voice-spike') === '1'
  const [view, setView] = useState<AppView>('home')
  const [inventoryCreateRequest, setInventoryCreateRequest] = useState(0)
  const [inventoryOverviewRequest, setInventoryOverviewRequest] = useState(0)
  const [recipesOverviewRequest, setRecipesOverviewRequest] = useState(0)
  const [recipeOpenRequest, setRecipeOpenRequest] = useState<{ recipeId: string | null; token: number }>({ recipeId: null, token: 0 })
  const [voiceOpen, setVoiceOpen] = useState(false)

  async function handleLogout() {
    await supabase?.auth.signOut()
  }

  function changeView(nextView: AppView) {
    if (nextView === 'recipes') {
      setRecipeOpenRequest((current) => ({ ...current, recipeId: null }))
    }
    if (nextView === 'inventory' && view === 'inventory') {
      setInventoryOverviewRequest((value) => value + 1)
    }
    if (nextView === 'recipes' && view === 'recipes') {
      setRecipesOverviewRequest((value) => value + 1)
    }
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openInventoryCreate() {
    setInventoryCreateRequest((value) => value + 1)
    setView('inventory')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openRecipeFromHome(recipeId: string) {
    setRecipeOpenRequest((current) => ({ recipeId, token: current.token + 1 }))
    setView('recipes')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openRecipeFromVoice(recipeId: string) {
    setRecipeOpenRequest((current) => ({ recipeId, token: current.token + 1 }))
    setView('recipes')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleInventoryCreateRequestHandled(requestToken: number) {
    setInventoryCreateRequest((currentToken) => (currentToken === requestToken ? 0 : currentToken))
  }

  const startSectionActive = view === 'home' || view === 'expiry'

  if (voiceSpikeMode) {
    return (
      <main className="app-layout voice-spike-shell">
        <header className="app-header">
          <div className="app-brand">
            <div className="brand-mark brand-mark-small" aria-hidden="true">K</div>
            <div>
              <p className="brand-kicker">Kitchen</p>
              <p className="app-greeting">Diagnostyka Voice · bez zapisów biznesowych</p>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={handleLogout} aria-label="Wyloguj z Kitchen" title="Wyloguj">
            <KitchenIcon name="logout" />
          </button>
        </header>
        <Suspense fallback={<div className="voice-spike-loading" aria-live="polite">Ładowanie diagnostyki STT…</div>}>
          <VoiceSttSpikePage onExit={() => { window.location.href = import.meta.env.BASE_URL }} />
        </Suspense>
      </main>
    )
  }

  return (
    <main className="app-layout">
      <header className="app-header">
        <div className="app-brand">
          <div className="brand-mark brand-mark-small" aria-hidden="true">K</div>
          <div>
            <p className="brand-kicker">Kitchen</p>
            <p className="app-greeting">Dzień dobry</p>
          </div>
        </div>
        <button className="icon-button" type="button" onClick={handleLogout} aria-label="Wyloguj z Kitchen" title="Wyloguj">
          <KitchenIcon name="logout" />
        </button>
      </header>

      {view === 'home' && (
        <HomePage
          ownerId={user.id}
          onAddProduct={openInventoryCreate}
          onOpenExpiry={() => changeView('expiry')}
          onOpenShopping={() => changeView('shopping')}
          onOpenRecipes={() => changeView('recipes')}
          onOpenRecipe={openRecipeFromHome}
        />
      )}

      {view === 'expiry' && (
        <ExpiryPage ownerId={user.id} onBack={() => changeView('home')} />
      )}

      {view === 'inventory' && (
        <InventoryPage
          ownerId={user.id}
          createRequestToken={inventoryCreateRequest}
          onCreateRequestHandled={handleInventoryCreateRequestHandled}
          overviewRequestToken={inventoryOverviewRequest}
        />
      )}

      {view === 'shopping' && <ShoppingPage ownerId={user.id} />}

      {view === 'recipes' && (
        <RecipesPage
          ownerId={user.id}
          overviewRequestToken={recipesOverviewRequest}
          openRecipeId={recipeOpenRequest.recipeId}
          openRecipeRequestToken={recipeOpenRequest.token}
        />
      )}

      <button
        className="voice-launch-button"
        type="button"
        onClick={() => setVoiceOpen(true)}
        aria-label="Otwórz Kitchen Voice"
        aria-expanded={voiceOpen}
      >
        <KitchenIcon name="microphone" size={25} strokeWidth={2} />
      </button>

      {voiceOpen && (
        <Suspense fallback={<div className="voice-sheet-loading" aria-live="polite">Uruchamiam Kitchen Voice…</div>}>
          <VoiceAssistantSheet
            ownerId={user.id}
            onClose={() => setVoiceOpen(false)}
            onOpenRecipe={openRecipeFromVoice}
          />
        </Suspense>
      )}

      <nav className="bottom-nav" aria-label="Główna nawigacja Kitchen">
        <button className={`nav-item${startSectionActive ? ' is-active' : ''}`} type="button" onClick={() => changeView('home')} aria-current={startSectionActive ? 'page' : undefined}>
          <KitchenIcon name="home" />
          <span>Start</span>
        </button>
        <button className={`nav-item${view === 'inventory' ? ' is-active' : ''}`} type="button" onClick={() => changeView('inventory')} aria-current={view === 'inventory' ? 'page' : undefined}>
          <KitchenIcon name="inventory" />
          <span>Zapasy</span>
        </button>
        <button className={`nav-item${view === 'shopping' ? ' is-active' : ''}`} type="button" onClick={() => changeView('shopping')} aria-current={view === 'shopping' ? 'page' : undefined}>
          <KitchenIcon name="shopping" />
          <span>Zakupy</span>
        </button>
        <button className={`nav-item${view === 'recipes' ? ' is-active' : ''}`} type="button" onClick={() => changeView('recipes')} aria-current={view === 'recipes' ? 'page' : undefined}>
          <KitchenIcon name="recipes" />
          <span>Przepisy</span>
        </button>
      </nav>
    </main>
  )
}
