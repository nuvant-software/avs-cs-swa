import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Loader from '../components/Loader'
import FilterRangeSlider from '../components/filters/FilterRangeSlider'
import MultiSearchSelect from '../components/filters/MultiSearchSelect'
import CarCard from '../components/CarCard'

// --- types ---
interface CarOverview {
  brand: string
  model: string
  variant: string
  price: number
  km?: number
  pk?: number
  body?: string
  transmission?: string
  doors?: number
}

type IncomingFilters =
  | {
      brands?: string[]
      models_by_brand?: Record<string, string[]>
      variants_by_brand_model?: Record<string, Record<string, string[]>>
      price_min?: number
      price_max?: number
    }
  | {
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

  const [cars, setCars] = useState<CarOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mobile overlay
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // ── UI filterstate ─────────────────────────────────────────────
  const [brandSelected, setBrandSelected] = useState<string[]>(
    ('brands' in initialFilters && Array.isArray(initialFilters.brands))
      ? (initialFilters.brands as string[])
      : (Array.isArray((initialFilters as any).brand) ? (initialFilters as any).brand : [])
  )

  const [modelSelected, setModelSelected] = useState<string[]>(() => {
    const out: string[] = []
    if ('models_by_brand' in initialFilters && initialFilters.models_by_brand) {
      Object.entries(initialFilters.models_by_brand!).forEach(([b, arr]) => {
        (arr || []).forEach(m => out.push(`${b} — ${m}`))
      })
      return out
    }
    if ((initialFilters as any).model && Array.isArray((initialFilters as any).model)) {
      const ms: string[] = (initialFilters as any).model
      const bset = new Set(brandSelected)
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

  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 0])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0])

  const [kmBounds, setKmBounds] = useState<[number, number]>([0, 0])
  const [kmRange, setKmRange] = useState<[number, number]>([0, 0])

  const [pkSelected, setPkSelected] = useState<string[]>([])
  const [bodySelected, setBodySelected] = useState<string[]>([])
  const [transSelected, setTransSelected] = useState<string[]>([])
  const [doorsSelected, setDoorsSelected] = useState<string[]>([])

  function parseModelTokens(tokens: string[]) {
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

  // ── FETCH ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    fetch('/api/filter_cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
          const prices = valid.map(c => c.price)
          const mn = Math.min(...prices)
          const mx = Math.max(...prices)
          setPriceBounds([mn, mx])
          setPriceRange([
            typeof (initialFilters as any).price_min === 'number' ? (initialFilters as any).price_min : mn,
            typeof (initialFilters as any).price_max === 'number' ? (initialFilters as any).price_max : mx
          ])

          const kms = valid.map(c => (typeof c.km === 'number' ? c.km : 0))
          const kmMax = Math.max(...kms, 0)
          setKmBounds([0, kmMax])
          setKmRange([0, kmMax])
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, []) // fetch 1x

  // ── FACETS/DERIVED ──────────────────────────────────────────────────────────
  const brandOptions = useMemo(
    () => Array.from(new Set(cars.map(c => c.brand))).sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' })),
    [cars]
  )

  const modelOptions = useMemo(() => {
    const base = brandSelected.length ? cars.filter(c => brandSelected.includes(c.brand)) : cars
    const uniq = new Set<string>()
    base.forEach(c => uniq.add(`${c.brand} — ${c.model}`))
    return Array.from(uniq).sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }))
  }, [cars, brandSelected])

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

  const modelsByBrand = useMemo(() => parseModelTokens(modelSelected), [modelSelected])
  const variantsByBrandModel = useMemo(() => parseVariantTokens(variantSelected), [variantSelected])

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

  useEffect(() => setPkSelected(sel => sel.filter(v => pkOptions.includes(v))), [pkOptions])
  useEffect(() => setBodySelected(sel => sel.filter(v => bodyOptions.includes(v))), [bodyOptions])
  useEffect(() => setTransSelected(sel => sel.filter(v => transOptions.includes(v))), [transOptions])
  useEffect(() => setDoorsSelected(sel => sel.filter(v => doorsOptions.includes(v))), [doorsOptions])

  const filteredCars = useMemo(() => {
    return baseAfterBMVAndSliders.filter(c => {
      if (pkSelected.length && !(c.pk != null && pkSelected.includes(String(c.pk)))) return false
      if (bodySelected.length && !(c.body && bodySelected.includes(String(c.body)))) return false
      if (transSelected.length && !(c.transmission && transSelected.includes(String(c.transmission)))) return false
      if (doorsSelected.length && !(c.doors != null && doorsSelected.includes(String(c.doors)))) return false
      return true
    })
  }, [baseAfterBMVAndSliders, pkSelected, bodySelected, transSelected, doorsSelected])

  if (loading) return <Loader />
  if (error)   return <Loader />

  // — Render van de filtervelden (hergebruikt) —
  const renderFilters = () => (
    <>
      <h2 className="text-lg font-semibold mb-3">Filters</h2>

      <div className="mb-4">
        <MultiSearchSelect
          label="Merk"
          options={brandOptions}
          selected={brandSelected}
          onChange={setBrandSelected}
        />
      </div>

      <div className="mb-4">
        <MultiSearchSelect
          label="Model"
          options={modelOptions}
          selected={modelSelected}
          onChange={setModelSelected}
          disabled={brandSelected.length === 0}
        />
      </div>

      <div className="mb-4">
        <MultiSearchSelect
          label="Variant"
          options={variantOptions}
          selected={variantSelected}
          onChange={setVariantSelected}
          disabled={modelSelected.length === 0}
        />
      </div>

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
    </>
  )

  return (
    <div className="w-full bg-white">
      {/* ───────── Hero alleen op md+; op mobiel direct naar resultaten ───────── */}
      <section className="relative hidden md:block">
        <div
          className="h-48 lg:h-56 w-full bg-center bg-cover"
          style={{ backgroundImage: `url('/images/collection-hero.jpg')` }}
        />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex items-center">
          <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-8">
            <h1 className="text-white text-4xl lg:text-5xl font-bold drop-shadow">Collectie</h1>
          </div>
        </div>
      </section>

      {/* ───────── Content container ───────── */}
      <div className="w-full max-w-screen-2xl mx-auto py-4 md:py-6">
        <div className="grid grid-cols-1 md:grid-cols-[33%_67%] lg:grid-cols-[minmax(260px,360px)_1fr]">
          {/* Sidebar (desktop/tablet) */}
          <aside className="hidden md:block border-r border-gray-200">
            <div className="sticky top-0 p-4 bg-white">
              {renderFilters()}
            </div>
          </aside>

          {/* Resultaten */}
          <section className="min-w-0">
            {/* ── Mobiel: STICKY filter-knop onder navbar (top:0) ──
                - zichtbaar alleen als overlay DICHT is
            */}
            {!mobileFiltersOpen && (
              <div className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between px-4 py-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm active:scale-[.99]"
                    onClick={() => setMobileFiltersOpen(true)}
                    aria-label="Open filters"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M3 5h18M6 12h12M10 19h4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Filters
                  </button>
                  <div className="text-sm text-gray-600">{filteredCars.length} resultaten</div>
                </div>
              </div>
            )}

            {/* Desktop/tablet teller-balk */}
            <div className="hidden md:flex items-center justify-end px-6 lg:px-8 mb-4 md:mb-6">
              <div className="text-sm text-gray-600">{filteredCars.length} resultaten</div>
            </div>

            {/* Cards grid */}
            <div className="px-4 md:px-6 lg:px-8 pb-8">
              {filteredCars.length === 0 ? (
                <div className="border rounded-xl p-8 text-center text-gray-600 bg-white">
                  Geen resultaten met de huidige filters.
                </div>
              ) : (
                <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] sm:[grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
                  {filteredCars.map((c, idx) => {
                    const mappedCar = {
                      id: (c as any).id || (c as any)._id || `${c.brand}-${c.model}-${idx}`,
                      brand: c.brand,
                      model: c.model,
                      variant: c.variant,
                      fuel: (c as any).fuel || (c as any).brandstof || "Onbekend",
                      mileage: typeof c.km === "number" ? c.km : (c as any).mileage || 0,
                      transmission: c.transmission || (c as any).gearbox || "Onbekend",
                      price: c.price,
                      year: (c as any).year || (c as any).bouwjaar || 0,
                      engine_size: (c as any).engine_size || (c as any).motorinhoud || "",
                      pk: typeof c.pk === "number" ? c.pk : (c as any).pk || 0,
                    }
                    return <CarCard key={mappedCar.id} car={mappedCar} layout="grid" imageFolder="car_001" />
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ───────── Mobiele fullscreen filters ───────── */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-white flex flex-col" role="dialog" aria-modal="true">
          {/* Header */}
          <div className="h-12 flex items-center justify-between px-4 border-b">
            <h2 className="text-base font-semibold">Filters</h2>
            <button
              type="button"
              className="rounded-md p-2 hover:bg-gray-100"
              onClick={() => setMobileFiltersOpen(false)}
              aria-label="Sluit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Inhoud */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderFilters()}
          </div>

          {/* Blauwe zoeken-knop */}
          <div className="p-3 border-t bg-white">
            <button
              type="button"
              className="w-full rounded-md !bg-[#27408B] hover:!bg-[#0A1833] text-white py-2 text-sm font-medium active:scale-[.99]"
              onClick={() => setMobileFiltersOpen(false)}
            >
              Zoeken
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Collection
