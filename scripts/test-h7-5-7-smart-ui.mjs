import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(path, 'utf8')
const [shell, home, inventory, shopping, recipes, cleaning, css, contract] = await Promise.all([
  read('src/components/AppShell.tsx'),
  read('src/features/home/HomePage.tsx'),
  read('src/features/inventory/InventoryPage.tsx'),
  read('src/features/shopping/ShoppingPage.tsx'),
  read('src/features/recipes/RecipesPage.tsx'),
  read('src/features/cleaning/CleaningShell.tsx'),
  read('src/styles/global.css'),
  read('tests/H7_5_7_SMART_UI_CONTRACT.md'),
])

// The bottom navigation is authoritative for module names. Hub return and
// logout remain real actions, not decorative controls.
assert.doesNotMatch(shell, /<p className="brand-kicker">Kitchen<\/p>[\s\S]*?<p className="app-greeting">Dzień dobry<\/p>/)
assert.match(shell, /className="module-home-button" onClick=\{onExit\}/)
for (const tab of ['Start', 'Zapasy', 'Zakupy', 'Przepisy']) {
  assert.match(shell, new RegExp(`<span>${tab}</span>`))
}

// Empty pages have one meaningful action/empty state and accessible names,
// without a second visual module heading or tautological helper text.
assert.match(home, /className="sr-only">Start<\/h1>/)
assert.doesNotMatch(home, /Twoja kuchnia|Dodaj pierwszy produkt i zacznij budować zasoby/)
assert.match(home, /\(homeStatus\.status !== 'ready' \|\| hasResources\)/)
for (const [page, name] of [[inventory, 'Zapasy'], [shopping, 'Zakupy'], [recipes, 'Przepisy']]) {
  assert.match(page, new RegExp(`<h1[^>]*className="sr-only"[^>]*>${name}<\\/h1>`))
}
assert.doesNotMatch(inventory, /Wybierz miejsce, żeby zobaczyć jego zawartość/)
assert.doesNotMatch(shopping, /Bieżąca lista|Dodaj to, czego brakuje w domu/)
assert.doesNotMatch(recipes, /Twoja książka kucharska|Zapisane przepisy pojawią się tutaj/)
assert.equal((shopping.match(/Wszystko kupione/g) ?? []).length, 1, 'purchased-only UI has one completion message')

// Keep the selected room title visible; hide only the text duplicated by
// Start / Rooms / Schedule tabs, retaining the H1 accessible name.
assert.match(cleaning, /className=\{selectedRoom \? 'brand-kicker cleaning-shell-page-title' : 'sr-only'\}/)
assert.match(cleaning, /aria-labelledby="cleaning-page-title"/)
assert.match(cleaning, /selectedRoom\?\.name \?\? 'Pomieszczenia'/)

// The ordered, disjoint suggestion lanes must not occupy space when empty.
const ready = home.indexOf('home-recipes-cookable"')
const ideas = home.indexOf('home-recipes-now"')
const general = home.indexOf('home-recipes-general"')
assert.ok(ready !== -1 && ready < ideas && ideas < general, 'Mogę ugotować -> Na teraz -> Przepisy')
assert.match(home, /recipeSuggestions\.cookableNow\.length > 0/)
assert.match(home, /recipeSuggestions\.now\.length > 0/)
assert.match(home, /recipeSuggestions\.general\.length > 0/)
assert.match(home, /recipeFilterActive/)
assert.match(home, /function HomeRecipeCard\(/)
assert.equal((home.match(/className="home-recipe-card"/g) ?? []).length, 1, 'one shared Home card renderer')
assert.doesNotMatch(home, /Wszystkie przepisy<\/button>|Inspiracje i planowanie|home-recipes-link/)
assert.doesNotMatch(css, /\.home-recipes-link\s*\{/)

assert.match(contract, /H7\.5\.7/)
assert.match(contract, /wznowienie PWA/)
console.log('H7.5.7 SMART UI / no empty panels / distinct recipe lanes: PASS')
