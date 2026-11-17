type SharedCatalogVisibilityChoiceProps = {
  inputId: string
  share: boolean
  disabled?: boolean
  onChange: (share: boolean) => void
}

/** Explicit opt-in, private by default. Render for a NEW typed identity only. */
export function SharedCatalogVisibilityChoice({
  inputId,
  share,
  disabled = false,
  onChange,
}: SharedCatalogVisibilityChoiceProps) {
  return (
    <fieldset className="shared-catalog-visibility" disabled={disabled}>
      <legend>Widoczność nowego produktu</legend>
      <label htmlFor={`${inputId}-private`}>
        <input
          id={`${inputId}-private`}
          type="radio"
          name={`${inputId}-visibility`}
          checked={!share}
          onChange={() => onChange(false)}
        />
        <span>Tylko dla mnie</span>
      </label>
      <label htmlFor={`${inputId}-shared`}>
        <input
          id={`${inputId}-shared`}
          type="radio"
          name={`${inputId}-visibility`}
          checked={share}
          onChange={() => onChange(true)}
        />
        <span>Dodaj do Katalogu Kitchen</span>
      </label>
      <p className="field-hint">Udostępniasz wyłącznie nazwę, rodzaj i sugerowaną jednostkę. Bez zapasów, ilości ani Twoich danych.</p>
    </fieldset>
  )
}
