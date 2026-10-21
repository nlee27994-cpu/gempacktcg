import { GAMES, SOURCES } from '../lib/catalog'
import { RARITIES, RARITY_STYLES } from '../lib/rarity'

function CheckGroup({ title, options, selected, onToggle, render }) {
  return (
    <fieldset>
      <legend className="label">{title}</legend>
      <div className="space-y-1">
        {options.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm text-slate-300 hover:bg-navy-800">
            <input
              type="checkbox"
              checked={selected.includes(o)}
              onChange={() => onToggle(o)}
              className="h-4 w-4 rounded border-navy-500 bg-navy-950 accent-emerald-500"
            />
            {render ? render(o) : o}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function ShopFilters({ filters, toggle, set, reset, activeCount }) {
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="label">Product type</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-navy-950/70 p-1">
          {[
            ['', 'All'],
            ['pack', 'Packs'],
            ['single', 'Singles'],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => set('type', value)}
              className={`rounded-md py-1.5 text-xs font-semibold transition ${
                filters.type === value ? 'bg-navy-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <CheckGroup title="Game" options={GAMES} selected={filters.game} onToggle={(v) => toggle('game', v)} />

      <CheckGroup
        title={filters.type === 'pack' ? 'Guaranteed hit' : 'Rarity'}
        options={RARITIES}
        selected={filters.rarity}
        onToggle={(v) => toggle('rarity', v)}
        render={(r) => (
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rotate-45 ${RARITY_STYLES[r].dot}`} />
            {r}
            <span className="text-xs text-slate-500">{RARITY_STYLES[r].gem}</span>
          </span>
        )}
      />

      <CheckGroup title="Source" options={SOURCES} selected={filters.source} onToggle={(v) => toggle('source', v)} />

      <fieldset>
        <legend className="label">Price</legend>
        <div className="flex items-center gap-2">
          <input
            className="input"
            type="number"
            min="0"
            inputMode="decimal"
            placeholder="Min $"
            value={filters.min}
            onChange={(e) => set('min', e.target.value)}
            aria-label="Minimum price"
          />
          <span className="text-slate-500">–</span>
          <input
            className="input"
            type="number"
            min="0"
            inputMode="decimal"
            placeholder="Max $"
            value={filters.max}
            onChange={(e) => set('max', e.target.value)}
            aria-label="Maximum price"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {[
            ['', '10', 'Under $10'],
            ['10', '50', '$10–50'],
            ['50', '250', '$50–250'],
            ['250', '', '$250+'],
          ].map(([min, max, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => set({ min, max })}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                filters.min === min && filters.max === max
                  ? 'border-emerald-gem bg-emerald-gem/10 text-emerald-300'
                  : 'border-navy-500 text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {activeCount > 0 && (
        <button type="button" onClick={reset} className="text-sm font-semibold text-emerald-300 hover:underline">
          Clear all filters ({activeCount})
        </button>
      )}
    </div>
  )
}
