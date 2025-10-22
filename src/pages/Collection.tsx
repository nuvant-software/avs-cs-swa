import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Loader from '../components/Loader'
import FilterRangeSlider from '../components/filters/FilterRangeSlider'
import MultiSearchSelect from '../components/filters/MultiSearchSelect'

/**
 * Pas dit type aan indien je meer velden hebt.
 * We lezen defensief uit de API en vullen undefined-safe.
 */
interface CarOverview {
  brand: string
  model: string
  variant: string
  price: number
  km?: number
  pk?: number
  body?: string            // Carrosserie
  transmission?: string    // Transmissie
  doors?: number           // Aantal deuren
}

type IncomingFilters =
  | {
      // nieuwe gescope’de payload vanaf Home
      brands?: string[]
      models_by_brand?: Record<string, string[]>
      variants_by_brand_model?: Record<string, Record<string, string[]>>
      price_min?: number
      price_max?: number
    }
  | {
      // legacy vorm (blijft ook werken)
      brand?: string[]
      model?: string[]
      variant?: string[]
      price_min?: number
      price_max?: number
    }
  | undefined

const Collection: React.FC = () => {
  const location = useLocation()
  const navState = (location.state as { filters?: IncomingFilters; includeItems?: boolean } | undefined) || {}
  const initialFilters = navState.filters || {}

  // ─────────────────────────────────────────────────────────────
  // DATA
  // ─────────────────────────────────────────────────────────────
  const [cars, setCars] = useState<CarOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─────────────────────────────────────────────────────────────
  // UI FILTER STATE (client-side)
  // ─────────────────────────────────────────────────────────────
  // Merk → simpele strings
  const [brandSelected, setBrandSelected] = useState<string[]>(
    ('brands' in initialFilters && Array.isArray(initialFilters.brands))
      ? (initialFilters.brands as string[])
      : (Array.isArray((initialFilters as any).brand) ? (initialFilters as any).brand : [])
  )
  // Model/Variant tokens:
  // Model   = "Brand — Model"
  // Variant = "Brand — Model — Variant"
  const [modelSelected, setModelSelected] = useState<string[]>(() => {
    // haal tokens uit models_by_brand of uit legacy model[]
    const out: string[] = []
    if ('models_by_brand' in initialFilters && initialFilters.models_by_brand) {
      Object.entries(initialFilters.models_by_brand!).forEach(([b, arr]) => {
        (arr || []).forEach(m => out.push(`${b} — ${m}`))
      })
      return out
    }
    if ((initialFilters as any).model && Array.isArray((initialFilters as any).model)) {
      // legacy (globaal): deze kunnen we helaas niet aan brands koppelen → toon als losse model-strings
      // We laten ze leeg tenzij er ook brands zijn; anders weten we de brand niet.
      const ms: string[] = (initialFilters as any).model
      const bset = new Set(brandSelected)
      // Als je bv. 1 brand gekozen had, mappen we model op die brand
      if (bset.size === 1) {
        const b = Array.from(bset)[0]
        return ms.map(m => `${b} — ${m}`)
      }
    }
    return out
  })
  const [variantSelected, setVariantSelected] = useState<string[]>(() => {
    const out: string[] = []
    if ('variants_by_brand_model' in initialFilters && initialFilters.variants_by_brand_model) {
      Object.entries(initialFilters.variants_by_brand_model!).forEach(([b, models]) => {
        Object.entries(models || {}).forEach(([m, vars]) => {
          (vars || []).forEach(v => out.push(`${b} — ${m} — ${v}`))
        })
      })
      return out
    }
    return out
  })

  // Range sliders
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 0])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0])

  const [kmBounds, setKmBounds] = useState<[number, number]>([0, 0])
  const [kmRange, setKmRange] = useState<[number, number]>([0, 0])

  // Checkbox-filters
  const [pkSelected, setPkSelected] = useState<string[]>([]) // strings van pk (we tonen unieke getallen als string)
  const [bodySelected, setBodySelected] = useState<string[]>([])
  const [transSelected, setTransSelected] = useState<string[]>([])
  const [doorsSelected, setDoorsSelected] = useState<string[]>([])

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────
  function parseModelTokens(tokens: string[]) {
    // "Brand — Model"
    const map: Record<string, Set<string>> = {}
    tokens.forEach(t => {
      const [brand, model] = t.split(' — ')
      if (!brand || !model) return
      if (!map[brand]) map[brand] = new Set()
      map[brand].add(model)
    })
    return map
  }

  function parseVariantTokens(tokens: string[]) {
    // "Brand — Model — Variant"
    const map: Record<string, Record<string, Set<string>>> = {}
    tokens.forEach(t => {
      const [brand, model, variant] = t.split(' — ')
      if (!brand || !model || !variant) return
      if (!map[brand]) map[brand] = {}
      if (!map[brand][model]) map[brand][model] = new Set()
      map[brand][model].add(variant)
    })
    return map
  }

  // ─────────────────────────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    fetch('/api/filter_cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // We kunnen hier alle items ophalen; filtering doen we client-side
      body: JSON.stringify({ filters: {}, includeItems: true })
    })
      .then(res => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data: { items?: any[] }) => {
        const items = Array.isArray(data.items) ? data.items : []
        const valid: CarOverview[] = items
          .map((i: any) => i?.car_overview || i?.carOverview || i)
          .filter(Boolean)
          .map((co: any) => ({
            brand: String(co.brand ?? ''),
            model: String(co.model ?? ''),
            variant: String(co.variant ?? ''),
            price: Number(co.price ?? 0),
            km: co.km != null ? Number(co.km) : (co.mileage ?? co.kilometers ?? undefined),
            pk: co.pk != null ? Number(co.pk) : (co.horsepower ?? undefined),
            body: co.body ?? co.body_type ?? co.carrosserie ?? undefined,
            transmission: co.transmission ?? co.gearbox ?? co.transmissie ?? undefined,
            doors: co.doors != null ? Number(co.doors) : (co.aantal_deuren ?? undefined),
          }))
          .filter(c => c.brand && c.model && c.variant && typeof c.price === 'number')

        setCars(valid)

        if (valid.length) {
          // price bounds
          const prices = valid.map(c => c.price)
          const mn = Math.min(...prices)
          const mx = Math.max(...prices)
          setPriceBounds([mn, mx])
          setPriceRange([
            typeof (initialFilters as any).price_min === 'number' ? (initialFilters as any).price_min : mn,
            typeof (initialFilters as any).price_max === 'number' ? (initialFilters as any).price_max : mx
          ])

          // km bounds (default 0..max)
          const kms = valid.map(c => (typeof c.km === 'number' ? c.km : 0))
          const kmMax = Math.max(...kms, 0)
          setKmBounds([0, kmMax])
          setKmRange([0, kmMax])
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, []) // fetch 1x

  // ─────────────────────────────────────────────────────────────
  // FACET OPTIONS
  // Merk: alle uit dataset
  const brandOptions = useMemo(
    () => Array.from(new Set(cars.map(c => c.brand))).sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' })),
    [cars]
  )

  // Model-opties (tokens "Brand — Model") afhankelijk van gekozen merken
  const modelOptions = useMemo(() => {
    const base = brandSelected.length ? cars.filter(c => brandSelected.includes(c.brand)) : cars
    const uniq = new Set<string>()
    base.forEach(c => uniq.add(`${c.brand} — ${c.model}`))
    return Array.from(uniq).sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }))
  }, [cars, brandSelected])

  // Variant-opties (tokens "Brand — Model — Variant") afhankelijk van gekozen (Brand — Model)
  const variantOptions = useMemo(() => {
    if (!modelSelected.length) return []
    const chosenBM = new Set(modelSelected)
    const uniq = new Set<string>()
    cars.forEach(c => {
      const bm = `${c.brand} — ${c.model}`
      if (!chosenBM.has(bm)) return
      uniq.add(`${c.brand} — ${c.model} — ${c.variant}`)
    })
    return Array.from(uniq).sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }))
  }, [cars, modelSelected])

  // ─────────────────────────────────────────────────────────────
  // SCOPING MAPS
  const modelsByBrand = useMemo(() => parseModelTokens(modelSelected), [modelSelected])
  const variantsByBrandModel = useMemo(() => parseVariantTokens(variantSelected), [variantSelected])

  // ─────────────────────────────────────────────────────────────
  // 1) EERST BMV + SLIDERS toepassen → basisset voor facetten
  const baseAfterBMVAndSliders = useMemo(() => {
    return cars.filter(c => {
      if (brandSelected.length && !brandSelected.includes(c.brand)) return false

      const mset = modelsByBrand[c.brand]
      if (mset && mset.size > 0 && !mset.has(c.model)) return false

      const vset = variantsByBrandModel[c.brand]?.[c.model]
      if (vset && vset.size > 0 && !vset.has(c.variant)) return false

      if (typeof c.price !== 'number' || c.price < priceRange[0] || c.price > priceRange[1]) return false

      const km = typeof c.km === 'number' ? c.km : 0
      if (km < kmRange[0] || km > kmRange[1]) return false

      return true
    })
  }, [cars, brandSelected, modelsByBrand, variantsByBrandModel, priceRange, kmRange])

  // Facet-opties (checkboxen) afgeleid van baseAfterBMVAndSliders
  const pkOptions = useMemo(() => {
    const set = new Set<string>()
    baseAfterBMVAndSliders.forEach(c => {
      if (typeof c.pk === 'number' && !Number.isNaN(c.pk)) set.add(String(c.pk))
    })
    return Array.from(set).sort((a, b) => Number(a) - Number(b))
  }, [baseAfterBMVAndSliders])

  const bodyOptions = useMemo(() => {
    const set = new Set<string>()
    baseAfterBMVAndSliders.forEach(c => { if (c.body) set.add(String(c.body)) })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }))
  }, [baseAfterBMVAndSliders])

  const transOptions = useMemo(() => {
    const set = new Set<string>()
    baseAfterBMVAndSliders.forEach(c => { if (c.transmission) set.add(String(c.transmission)) })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }))
  }, [baseAfterBMVAndSliders])

  const doorsOptions = useMemo(() => {
    const set = new Set<string>()
    baseAfterBMVAndSliders.forEach(c => {
      if (typeof c.doors === 'number' && !Number.isNaN(c.doors)) set.add(String(c.doors))
    })
    return Array.from(set).sort((a, b) => Number(a) - Number(b))
  }, [baseAfterBMVAndSliders])

  // Houd gekozen checkbox-filters in sync met opties (als opties kleiner worden)
  useEffect(() => setPkSelected(sel => sel.filter(v => pkOptions.includes(v))), [pkOptions])
  useEffect(() => setBodySelected(sel => sel.filter(v => bodyOptions.includes(v))), [bodyOptions])
  useEffect(() => setTransSelected(sel => sel.filter(v => transOptions.includes(v))), [transOptions])
  useEffect(() => setDoorsSelected(sel => sel.filter(v => doorsOptions.includes(v))), [doorsOptions])

  // 2) Daarna pas checkbox-filters toepassen → eindresultaat
  const filteredCars = useMemo(() => {
    return baseAfterBMVAndSliders.filter(c => {
      if (pkSelected.length && !(c.pk != null && pkSelected.includes(String(c.pk)))) return false
      if (bodySelected.length && !(c.body && bodySelected.includes(String(c.body)))) return false
      if (transSelected.length && !(c.transmission && transSelected.includes(String(c.transmission)))) return false
      if (doorsSelected.length && !(c.doors != null && doorsSelected.includes(String(c.doors)))) return false
      return true
    })
  }, [baseAfterBMVAndSliders, pkSelected, bodySelected, transSelected, doorsSelected])

  // ─────────────────────────────────────────────────────────────
  if (loading) return <Loader />
  if (error)   return <Loader />

  return (
    <div className="w-11/12 max-w-7xl mx-auto py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* FILTERBAR LEFT */}
      <aside className="bg-white shadow-sm border border-gray-200 rounded-xl p-4 h-max sticky top-24">
        <h2 className="text-lg font-semibold mb-3">Filters</h2>

        {/* Merk */}
        <div className="mb-4">
          <MultiSearchSelect
            label="Merk"
            options={brandOptions}
            selected={brandSelected}
            onChange={setBrandSelected}
          />
        </div>

        {/* Model (tokens) */}
        <div className="mb-4">
          <MultiSearchSelect
            label="Model"
            options={modelOptions}
            selected={modelSelected}
            onChange={setModelSelected}
            disabled={brandSelected.length === 0}
          />
        </div>

        {/* Variant (tokens) */}
        <div className="mb-4">
          <MultiSearchSelect
            label="Variant"
            options={variantOptions}
            selected={variantSelected}
            onChange={setVariantSelected}
            disabled={modelSelected.length === 0}
          />
        </div>

        {/* Prijs */}
        <div className="mb-4">
          <FilterRangeSlider
            label="Prijs"
            min={priceBounds[0]}
            max={priceBounds[1]}
            value={priceRange}
            onChange={setPriceRange}
            placeholderMin={priceBounds[0].toString()}
            placeholderMax={priceBounds[1].toString()}
          />
        </div>

        {/* Kilometerstand */}
        <div className="mb-6">
          <FilterRangeSlider
            label="Kilometerstand"
            min={kmBounds[0]}
            max={kmBounds[1]}
            value={kmRange}
            onChange={setKmRange}
            placeholderMin={kmBounds[0].toString()}
            placeholderMax={kmBounds[1].toString()}
          />
        </div>

        {/* Checkbox-facetten gebruiken dezelfde MultiSearchSelect (heeft checkboxes) */}
        <div className="mb-4">
          <MultiSearchSelect
            label="PK"
            options={pkOptions}
            selected={pkSelected}
            onChange={setPkSelected}
          />
        </div>

        <div className="mb-4">
          <MultiSearchSelect
            label="Carrosserie"
            options={bodyOptions}
            selected={bodySelected}
            onChange={setBodySelected}
          />
        </div>

        <div className="mb-4">
          <MultiSearchSelect
            label="Transmissie"
            options={transOptions}
            selected={transSelected}
            onChange={setTransSelected}
          />
        </div>

        <div>
          <MultiSearchSelect
            label="Aantal deuren"
            options={doorsOptions}
            selected={doorsSelected}
            onChange={setDoorsSelected}
          />
        </div>
      </aside>

      {/* RESULTS RIGHT */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Collectie</h1>
          <div className="text-sm text-gray-600">{filteredCars.length} resultaten</div>
        </div>

        {filteredCars.length === 0 ? (
          <div className="border rounded-xl p-8 text-center text-gray-600">
            Geen resultaten met de huidige filters.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCars.map((c, idx) => (
              <article key={idx} className="border rounded-xl overflow-hidden bg-white">
                {/* placeholder image logic if you have images per car, else static */}
                <div className="h-44 bg-gray-100" />
                <div className="p-4">
                  <div className="text-lg font-semibold">{c.brand} {c.model}</div>
                  <div className="text-sm text-gray-600">{c.variant}</div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                    {typeof c.km === 'number' && <span>{c.km.toLocaleString()} km</span>}
                    {typeof c.pk === 'number' && <span>{c.pk} pk</span>}
                    {c.body && <span>{c.body}</span>}
                    {c.transmission && <span>{c.transmission}</span>}
                    {typeof c.doors === 'number' && <span>{c.doors} deuren</span>}
                  </div>
                  <div className="mt-3 font-bold">€ {c.price.toLocaleString()}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Collection
