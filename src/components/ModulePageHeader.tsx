import { KitchenIcon } from './KitchenIcon'

type ModulePageHeaderProps = {
  title: string
  module: 'food' | 'cleaning'
  onExit: () => void
  onLogout: () => void
  titleId?: string
}

/** One navigation/header authority shared by Food and Cleaning. Page tools live in page content. */
export function ModulePageHeader({ title, module, onExit, onLogout, titleId = 'module-page-title' }: ModulePageHeaderProps) {
  return (
    <header className={`app-header module-page-header module-page-header-${module}`}>
      <div className="app-brand module-page-brand">
        <div className={`brand-mark brand-mark-small${module === 'cleaning' ? ' cleaning-brand-mark' : ''}`} aria-hidden="true">
          {module === 'cleaning' ? <KitchenIcon name="cleaning" size={23} /> : 'K'}
        </div>
        <h1 id={titleId} className="module-page-title" title={title}>{title}</h1>
      </div>
      <div className="module-header-actions">
        <button type="button" className="module-home-button" onClick={onExit} aria-label="Wróć do strony głównej Dom">
          <KitchenIcon name="home" size={19} /><span>Dom</span>
        </button>
        <button className="icon-button" type="button" onClick={onLogout} aria-label="Wyloguj z Kitchen" title="Wyloguj">
          <KitchenIcon name="logout" />
        </button>
      </div>
    </header>
  )
}
