import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Loader from '../components/Loader'
import FilterRangeSlider from '../components/filters/FilterRangeSlider'
import MultiSearchSelect from '../components/filters/MultiSearchSelect'
import CarCard from '../components/CarCard'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'

interface CarOverview {
  id?: string
  brand: string
  model: string
  variant: string
  price: number
  km?: number
  pk?: number
  body?: string
  transmission?: string
  doors?: number
  fuel?: string
  year?: number
  engine_size?: string
  imageFolder?: string
  sourceId?: string
}

type StructuredNavFilters = {
  brands?: string[]
  models_by_brand?: Record<string, string[]>
  variants_by_brand_model?: Record<string, Record<string, string[]>>
  price_min?: number
  price_max?: number
}

type LegacyNavFilters = {
  brand?: string[]
  model?: string[]
  variant?: string[]
  price_min?: number
  price_max?: number
}

type IncomingFilters = StructuredNavFilters | LegacyNavFilters | undefined

const isStructuredFilters = (filters: IncomingFilters): filters is StructuredNavFilters =>
  !!filters && typeof filters === 'object' && 'brands' in filters

const isLegacyFilters = (filters: IncomingFilters): filters is LegacyNavFilters =>
  !!filters && typeof filters === 'object' && 'brand' in filters

const NAV_HEIGHT_FALLBACK = 120 // px

type CarCardProps = React.ComponentProps<typeof CarCard>
type GridCar = CarCardProps['car']

type GridCardData = {
  id: string
  car: GridCar
  imageFolder?: string
}

const FALLBACK_IMAGE_FOLDER = 'car_001'

// Stabiele key zonder index
const buildStableId = (car: CarOverview): string => {
  const raw = [car.id, car.sourceId].find(v => typeof v === 'string' && v.trim().length)
  if (raw) return raw!.trim()
  return [
    (car.brand || '').trim().toLowerCase(),
    (car.model || '').trim().toLowerCase(),
    (car.variant || '').trim().toLowerCase(),
    String(car.year ?? ''),
    (car.transmission || '').trim().toLowerCase(),
    (car.engine_size || '').trim().toLowerCase(),
    (car.fuel || '').trim().toLowerCase(),
  ].join('|')
}

const carkmToNum = (km: number) => km

const mapCarToGridData = (car: CarOverview): GridCardData => {
  const id = buildStableId(car)
  const card: GridCar = {
    id,
    brand: car.brand,
    model: car.model,
    variant: car.variant,
    fuel: car.fuel || 'Onbekend',
    mileage: typeof car.km === 'number' ? carkmToNum(car.km) : 0,
    transmission: car.transmission || 'Onbekend',
    price: car.price,
    year: car.year ?? 0,
    engine_size: car.engine_size || '',
    pk: typeof car.pk === 'number' ? car.pk : 0,
  }
  const imageFolder = car.imageFolder && car.imageFolder.trim().length ? car.imageFolder.trim() : FALLBACK_IMAGE_FOLDER
  return { id, car: card, imageFolder }
}

const pickString = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length) return trimmed
    }
  }
  return undefined
}

const pickNumber = (record: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && !Number.isNaN(value)) return value
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length) {
        const parsed = Number(trimmed)
        if (!Number.isNaN(parsed)) return parsed
      }
    }
  }
  return undefined
}

const ensureStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []

// Sorteren
type SortBy = 'brandModelVariant' | 'price' | 'km' | 'year'
type SortDir = 'asc' | 'desc'

const composeBMV = (c: CarOverview) =>
  `${(c.brand || '').toLowerCase()}|${(c.model || '').toLowerCase()}|${(c.variant || '').toLowerCase()}`
const cmpNum = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0)

// Altijd-beschikbare keuzes
const BASE_TRANSMISSIONS = ['Automaat', 'Handgeschakeld']
const BASE_BODIES = ['Hatchback','Sedan','Stationwagon','SUV','MPV','Coupé','Cabrio','Pick-up','Bestel']
const BASE_FUELS = ['Benzine','Diesel','Elektrisch','Hybride','LPG']
const BASE_DOORS = ['2','3','4','5']

const Collection: React.FC = () => {
  const location = useLocation()
  const navState = (location.state as { filters?: IncomingFilters; includeItems?: boolean } | undefined) || {}
  const initialFilters = navState.filters || {}

  // Data
  const [cars, setCars] = useState<CarOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Sort state
  const [sortBy, setSortBy] = useState<SortBy>('brandModelVariant')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Filters
  const initialBrandSelection = (() => {
    if (isStructuredFilters(initialFilters) && initialFilters.brands) {
      return ensureStringArray(initialFilters.brands)
    }
    if (isLegacyFilters(initialFilters) && initialFilters.brand) {
      return ensureStringArray(initialFilters.brand)
    }
    return []
  })()
  const [brandSelected, setBrandSelected] = useState<string[]>(initialBrandSelection)

  const initialModelSelection = (() => {
    const out: string[] = []
    if (isStructuredFilters(initialFilters) && initialFilters.models_by_brand) {
      Object.entries(initialFilters.models_by_brand).forEach(([brand, arr]) =>
        ensureStringArray(arr).forEach(model => out.push(`${brand} — ${model}`))
      )
      return out
    }
    if (isLegacyFilters(initialFilters) && initialFilters.model) {
      const models = ensureStringArray(initialFilters.model)
      const brandSet = new Set(initialBrandSelection)
      if (brandSet.size === 1) {
        const [brand] = Array.from(brandSet)
        return models.map(model => `${brand} — ${model}`)
      }
    }
    return out
  })()
  const [modelSelected, setModelSelected] = useState<string[]>(initialModelSelection)

  const initialVariantSelection = (() => {
    const out: string[] = []
    if (isStructuredFilters(initialFilters) && initialFilters.variants_by_brand_model) {
      Object.entries(initialFilters.variants_by_brand_model).forEach(([brand, models]) => {
        Object.entries(models || {}).forEach(([model, variants]) =>
          ensureStringArray(variants).forEach(variant => out.push(`${brand} — ${model} — ${variant}`))
        )
      })
      return out
    }
    return out
  })()
  const [variantSelected, setVariantSelected] = useState<string[]>(initialVariantSelection)

  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 0])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0])
  const [kmBounds, setKmBounds] = useState<[number, number]>([0, 0])
  const [kmRange, setKmRange] = useState<[number, number]>([0, 0])

  // PK-slider
  const [pkBounds, setPkBounds] = useState<[number, number]>([0, 0])
  const [pkRange, setPkRange] = useState<[number, number]>([0, 0])

  // Multi-select filters
  const [bodySelected, setBodySelected] = useState<string[]>([])
  const [transSelected, setTransSelected] = useState<string[]>([])
  const [doorsSelected, setDoorsSelected] = useState<string[]>([])
  const [fuelSelected, setFuelSelected] = useState<string[]>([])

  // Fetch
  useEffect(() => {
    setLoading(true)
    fetch('/api/filter_cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters: {}, includeItems: true })
    })
      .then(res => { if (!res.ok) throw new Error(res.statusText); return res.json() })
      .then((data: { items?: unknown[] }) => {
        const items = Array.isArray(data.items) ? data.items : []
        const valid: CarOverview[] = items
          .map(item => {
            if (item && typeof item === 'object') {
              const record = item as Record<string, unknown>
              const nested = record.car_overview ?? record.carOverview
              if (nested && typeof nested === 'object') return nested as Record<string, unknown>
              return record
            }
            return null
          })
          .filter((record): record is Record<string, unknown> => !!record)
          .map(record => {
            const id = pickString(record, ['id', '_id', 'car_id', 'carId', 'slug', 'vin'])
            const brand = pickString(record, ['brand']) ?? ''
            const model = pickString(record, ['model']) ?? ''
            const variant = pickString(record, ['variant']) ?? ''
            const price = pickNumber(record, ['price']) ?? 0
            const km = pickNumber(record, ['km', 'mileage', 'kilometers'])
            const pk = pickNumber(record, ['pk', 'horsepower'])
            const body = pickString(record, ['body', 'body_type', 'carrosserie'])
            const transmission = pickString(record, ['transmission', 'gearbox', 'transmissie'])
            const doors = pickNumber(record, ['doors', 'aantal_deuren'])
            const fuel = pickString(record, ['fuel', 'brandstof'])
            const year = pickNumber(record, ['year', 'bouwjaar'])
            const engineSize = pickString(record, ['engine_size', 'motorinhoud'])
            const imageFolder = pickString(record, ['imageFolder', 'image_folder', 'folder', 'imagefolder'])

            return {
              id: id,
              brand,
              model,
              variant,
              price,
              km: km ?? undefined,
              pk: pk ?? undefined,
              body: body ?? undefined,
              transmission: transmission ?? undefined,
              doors: doors ?? undefined,
              fuel: fuel ?? undefined,
              year: year ?? undefined,
              engine_size: engineSize ?? undefined,
              imageFolder: imageFolder ?? undefined,
              sourceId: id ?? undefined,
            }
          })
          .filter(c => c.brand && c.model && c.variant && typeof c.price === 'number')

        setCars(valid)

        if (valid.length) {
          const prices = valid.map(c => c.price)
          const mn = Math.min(...prices)
          const mx = Math.max(...prices)
          setPriceBounds([mn, mx])
          setPriceRange([mn, mx])

          const kms = valid.map(c => (typeof c.km === 'number' ? c.km : 0))
          const kmMax = Math.max(...kms, 0)
          setKmBounds([0, kmMax])
          setKmRange([0, kmMax])

          const pks = valid.map(c => (typeof c.pk === 'number' ? c.pk : 0))
          const pkMin = Math.min(...pks, 0)
          const pkMax = Math.max(...pks, 0)
          setPkBounds([pkMin, pkMax])
          setPkRange([pkMin, pkMax])
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Derived facets
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

  // Lookups voor gekozen model/variant
  const modelsByBrand = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    modelSelected.forEach(token => {
      const [b, m] = token.split(' — ')
      if (b && m) {
        if (!map[b]) map[b] = new Set()
        map[b].add(m)
      }
    })
    return map
  }, [modelSelected])

  const variantsByBrandModel = useMemo(() => {
    const map: Record<string, Record<string, Set<string>>> = {}
    variantSelected.forEach(token => {
      const [b, m, v] = token.split(' — ')
      if (b && m && v) {
        if (!map[b]) map[b] = {}
        if (!map[b][m]) map[b][m] = new Set()
        map[b][m].add(v)
      }
    })
    return map
  }, [variantSelected])

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
      // PK range
      const pk = typeof c.pk === 'number' ? c.pk : 0
      if (pk < pkRange[0] || pk > pkRange[1]) return false
      return true
    })
  }, [cars, brandSelected, modelsByBrand, variantsByBrandModel, priceRange, kmRange, pkRange])

  // Altijd-beschikbare facet-options (union met dataset-afgeleide)
  const bodyOptions = useMemo(() => {
    const set = new Set<string>(BASE_BODIES)
    baseAfterBMVAndSliders.forEach(c => { if (c.body) set.add(String(c.body)) })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }))
  }, [baseAfterBMVAndSliders])

  const transOptions = useMemo(() => {
    const set = new Set<string>(BASE_TRANSMISSIONS)
    baseAfterBMVAndSliders.forEach(c => { if (c.transmission) set.add(String(c.transmission)) })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }))
  }, [baseAfterBMVAndSliders])

  const doorsOptions = useMemo(() => {
    const set = new Set<string>(BASE_DOORS)
    baseAfterBMVAndSliders.forEach(c => {
      if (typeof c.doors === 'number' && !Number.isNaN(c.doors)) set.add(String(c.doors))
    })
    return Array.from(set).sort((a, b) => Number(a) - Number(b))
  }, [baseAfterBMVAndSliders])

  const fuelOptions = useMemo(() => {
    const set = new Set<string>(BASE_FUELS)
    baseAfterBMVAndSliders.forEach(c => { if (c.fuel) set.add(String(c.fuel)) })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }))
  }, [baseAfterBMVAndSliders])

  // Houd geselecteerde waarden in sync met beschikbare opties
  useEffect(() => setBodySelected(sel => sel.filter(v => bodyOptions.includes(v))), [bodyOptions])
  useEffect(() => setTransSelected(sel => sel.filter(v => transOptions.includes(v))), [transOptions])
  useEffect(() => setDoorsSelected(sel => sel.filter(v => doorsOptions.includes(v))), [doorsOptions])
  useEffect(() => setFuelSelected(sel => sel.filter(v => fuelOptions.includes(v))), [fuelOptions])

  // Eindfilter + sorteren
  const filteredAndSortedCars = useMemo(() => {
    const afterFacets = baseAfterBMVAndSliders.filter(c => {
      if (bodySelected.length && !(c.body && bodySelected.includes(String(c.body)))) return false
      if (transSelected.length && !(c.transmission && transSelected.includes(String(c.transmission)))) return false
      if (doorsSelected.length && !(c.doors != null && doorsSelected.includes(String(c.doors)))) return false
      if (fuelSelected.length && !(c.fuel && fuelSelected.includes(String(c.fuel)))) return false
      return true
    })

    const base = afterFacets.slice()
    base.sort((a, b) => {
      let res = 0
      switch (sortBy) {
        case 'brandModelVariant':
          res = composeBMV(a).localeCompare(composeBMV(b), 'nl', { sensitivity: 'base' })
          break
        case 'price':
          res = cmpNum(a.price ?? 0, b.price ?? 0)
          break
        case 'km':
          res = cmpNum((a.km ?? 0), (b.km ?? 0))
          break
        case 'year':
          res = cmpNum((a.year ?? 0), (b.year ?? 0))
          break
      }
      return sortDir === 'asc' ? res : -res
    })
    return base
  }, [baseAfterBMVAndSliders, bodySelected, transSelected, doorsSelected, fuelSelected, sortBy, sortDir])

  const gridCardData = useMemo(
    () => filteredAndSortedCars.map((car) => mapCarToGridData(car)),
    [filteredAndSortedCars]
  )

  // ——— Pagination ———
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(gridCardData.length / PAGE_SIZE))
  }, [gridCardData.length])

  useEffect(() => {
    // clamp current page als dataset wijzigt
    if (page > totalPages) setPage(totalPages)
    if (page < 1) setPage(1)
  }, [page, totalPages])

  const pageStartIndex = (page - 1) * PAGE_SIZE
  const pageEndIndex = Math.min(page * PAGE_SIZE, gridCardData.length)

  const pagedGridData = useMemo(() => {
    return gridCardData.slice(pageStartIndex, pageEndIndex)
  }, [gridCardData, pageStartIndex, pageEndIndex])

  // Reset naar pagina 1 bij filter-/sort-wijzigingen
  useEffect(() => { setPage(1) }, [brandSelected, modelSelected, variantSelected])
  useEffect(() => { setPage(1) }, [priceRange, kmRange, pkRange, bodySelected, transSelected, doorsSelected, fuelSelected])
  useEffect(() => { setPage(1) }, [sortBy, sortDir])

  // NAVBAR overlay ↔ solid
  const heroEndRef = useRef<HTMLDivElement | null>(null)
  const [navBottom, setNavBottom] = useState<number>(NAV_HEIGHT_FALLBACK)
  const [navSolid, setNavSolid] = useState<boolean>(false)
  const navOffset = Math.max(navBottom, NAV_HEIGHT_FALLBACK)

  useEffect(() => {
    const onMetrics = (e: Event) => {
      const ce = e as CustomEvent<{ bottom: number; height: number; mode: 'overlay' | 'solid' }>
      if (ce?.detail?.bottom) setNavBottom(ce.detail.bottom)
    }
    window.addEventListener('avs:nav-metrics', onMetrics)
    window.dispatchEvent(new Event('avs:request-nav-metrics'))
    return () => window.removeEventListener('avs:nav-metrics', onMetrics)
  }, [])

  useEffect(() => {
    const el = heroEndRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        const solid = !entry.isIntersecting
        setNavSolid(solid)
        window.dispatchEvent(new CustomEvent('avs:nav-mode', { detail: { mode: solid ? 'solid' : 'overlay' } }))
      },
      { threshold: 0, root: null, rootMargin: `-${Math.max(0, navOffset)}px 0px 0px 0px` }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [navOffset])

  // Smooth scroll naar de grid bij paginawissel
  const gridTopRef = useRef<HTMLDivElement | null>(null)
  const goToPage = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages)
    if (next !== page) setPage(next)
    requestAnimationFrame(() => {
      const y = (gridTopRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - navOffset - 16
      window.scrollTo({ top: y, behavior: 'smooth' })
    })
  }

  if (loading) return <Loader />
  if (error) return <Loader />

  // ———————————— Icons ————————————
  const MileageIcon = () => (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 inline-block align-[-1px]"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6V4z" />
      <path d="M13 12.5 17 9l-1.4-1.4-4 3a2.5 2.5 0 1 0 1.4 1.9z" />
    </svg>
  )
  const CalendarIcon = () => (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 inline-block align-[-1px]"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2zm13 8H4v10h16V10z" />
    </svg>
  )

  // ———————————— Sorteerknoppen (blauwe tekst, geen hover/geen achtergrond) ————————————
  const SortPill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-1.5 py-1 text-sm',
        'bg-transparent !bg-transparent border-0 !border-0 rounded-none',
        'shadow-none outline-none appearance-none ring-0 focus:outline-none focus:ring-0',
        'hover:bg-transparent active:bg-transparent',
        'text-[#1C448E]',
        active ? 'font-semibold' : 'font-normal',
      ].join(' ')}
    >
      {children}
    </button>
  )

  // Sorteercontrols (in witte balk)
  const renderSortControls = () => (
    <div
      className={[
        'flex items-center gap-4',
        '[&_button]:bg-transparent [&_button]:!bg-transparent',
        '[&_button]:border-0 [&_button]:!border-0',
        '[&_button]:rounded-none',
        '[&_button]:shadow-none',
        '[&_button]:ring-0 [&_button]:focus:ring-0 [&_button]:outline-none',
        '[&_button:hover]:bg-transparent [&_button:active]:bg-transparent',
      ].join(' ')}
    >
      <span className="text-sm text-gray-700">
        {gridCardData.length === 0
          ? '0 resultaten'
          : `${pageStartIndex + 1}–${pageEndIndex} van ${gridCardData.length} resultaten`}
      </span>

      <SortPill active={sortBy === 'brandModelVariant'} onClick={() => setSortBy('brandModelVariant')}>A-z</SortPill>
      <SortPill active={sortBy === 'price'} onClick={() => setSortBy('price')}>Prijs</SortPill>
      <SortPill active={sortBy === 'km'} onClick={() => setSortBy('km')}>
        <span className="inline-flex items-center gap-1"><MileageIcon /> km</span>
      </SortPill>
      <SortPill active={sortBy === 'year'} onClick={() => setSortBy('year')}>
        <span className="inline-flex items-center gap-1"><CalendarIcon /> jaar</span>
      </SortPill>

      <button
        type="button"
        onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
        aria-label="Draai sorteer volgorde"
        title="Draai sorteer volgorde"
        className={[
          'p-0 m-0',
          'bg-transparent !bg-transparent border-0 !border-0 rounded-none',
          'shadow-none outline-none appearance-none ring-0 focus:outline-none focus:ring-0',
          'hover:bg-transparent active:bg-transparent',
          'text-[#1C448E] leading-none',
        ].join(' ')}
      >
        <svg
          viewBox="0 0 24 24"
          className={['w-5 h-5 transition-transform duration-200 inline-block', sortDir === 'desc' ? 'rotate-180' : 'rotate-0'].join(' ')}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 5 L5 15 H19 Z" fill="currentColor" />
        </svg>
      </button>
    </div>
  )

  const renderFilters = () => (
    <>
      {/* geen "Filters" titel */}

      <div className="mb-4">
        <MultiSearchSelect label="Merk" options={brandOptions} selected={brandSelected} onChange={setBrandSelected} />
      </div>

      <div className="mb-4">
        <MultiSearchSelect label="Model" options={modelOptions} selected={modelSelected} onChange={setModelSelected} disabled={!brandSelected.length} />
      </div>

      <div className="mb-4">
        <MultiSearchSelect label="Variant" options={variantOptions} selected={variantSelected} onChange={setVariantSelected} disabled={!modelSelected.length} />
      </div>

      <div className="mb-4">
        <FilterRangeSlider label="Prijs" min={priceBounds[0]} max={priceBounds[1]} value={priceRange} onChange={setPriceRange} />
      </div>

      <div className="mb-6">
        <FilterRangeSlider label="Kilometerstand" min={kmBounds[0]} max={kmBounds[1]} value={kmRange} onChange={setKmRange} />
      </div>

      {/* PK als slider */}
      <div className="mb-6">
        <FilterRangeSlider label="PK" min={pkBounds[0]} max={pkBounds[1]} value={pkRange} onChange={setPkRange} />
      </div>

      <div className="mb-4">
        <MultiSearchSelect label="Brandstof" options={fuelOptions} selected={fuelSelected} onChange={setFuelSelected} />
      </div>

      <div className="mb-4">
        <MultiSearchSelect label="Carrosserie" options={bodyOptions} selected={bodySelected} onChange={setBodySelected} />
      </div>

      <div className="mb-4">
        <MultiSearchSelect label="Transmissie" options={transOptions} selected={transSelected} onChange={setTransSelected} />
      </div>

      <div>
        <MultiSearchSelect label="Aantal deuren" options={doorsOptions} selected={doorsSelected} onChange={setDoorsSelected} />
      </div>
    </>
  )

  return (
    <div className="w-full bg-white">
      {/* HERO */}
      <section className="relative">
        <div className="h-40 md:h-56 lg:h-64 w-full bg-center bg-cover" style={{ backgroundImage: `url('/images/collection-hero.jpg')` }} />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex items-center">
          <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8">
            <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold drop-shadow">Collectie</h1>
          </div>
        </div>
      </section>

      <div ref={heroEndRef} aria-hidden className="h-0" />

      {/* CONTENT */}
      <div className="w-full max-w-screen-2xl mx-auto" style={{ paddingTop: navSolid ? `${navOffset}px` : 0 }}>
        <div className="grid grid-cols-1 md:grid-cols-[33%_67%] lg:grid-cols-[minmax(260px,360px)_1fr]">
          {/* Sidebar */}
          <aside className="hidden md:block border-r border-gray-200">
            <div className="sticky p-4 bg-white" style={{ top: `${navOffset}px` }}>
              {renderFilters()}
            </div>
          </aside>

          {/* Resultaten */}
          <section className="min-w-0">
            {/* Mobiele filter- en sort-balk (sticky) */}
            {!mobileFiltersOpen && (
              <div
                className="md:hidden sticky z-30 bg-white"
                style={{ top: `${navOffset}px` }}
              >
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
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-700">
                      {gridCardData.length === 0
                        ? '0 resultaten'
                        : `${pageStartIndex + 1}–${pageEndIndex} van ${gridCardData.length} resultaten`}
                    </div>
                    <div className="flex items-center">{renderSortControls()}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop sort-balk sticky — witte balk */}
            <div
              className="hidden md:flex items-center justify-between px-6 lg:px-8 mb-4 md:mb-6 sticky bg-white z-20"
              style={{ top: `${navOffset}px` }}
            >
              <div className="py-2 w-full">{renderSortControls()}</div>
            </div>

            {/* Grid */}
            <div className="px-4 md:px-6 lg:px-8 pb-8">
              <div ref={gridTopRef} />
              {gridCardData.length === 0 ? (
                <div className="border rounded-xl p-8 text-center text-gray-600 bg-white">
                  Geen resultaten met de huidige filters.
                </div>
              ) : (
                <>
                  <LayoutGroup>
                    <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
                      <AnimatePresence initial={false} mode="popLayout">
                        {pagedGridData.map((data) => (
                          <motion.div
                            key={data.id}
                            layout="position"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, y: 28 }}
                            transition={{
                              layout: { type: 'spring', stiffness: 420, damping: 32, mass: 0.3 },
                              duration: 0.22,
                              opacity: { duration: 0.18 }
                            }}
                            className="w-full will-change-transform"
                          >
                            <CarCard car={data.car} layout="grid" imageFolder={data.imageFolder} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </LayoutGroup>

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2 select-none">
                      {/* Vorige */}
                      <button
                        type="button"
                        onClick={() => goToPage(page - 1)}
                        disabled={page === 1}
                        className={[
                          'px-2 py-1 text-sm',
                          'text-[#1C448E]',
                          'bg-transparent border-0 rounded-none shadow-none',
                          'focus:outline-none focus:ring-0',
                          page === 1 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                        ].join(' ')}
                        aria-label="Vorige pagina"
                      >
                        Vorige
                      </button>

                      {/* Nummers zonder hover, transparant; geselecteerde met blauwe underline */}
                      {(() => {
                        const items: (number | '…')[] = []
                        const add = (n: number | '…') => items.push(n)
                        const windowSize = 1
                        const start = Math.max(2, page - windowSize)
                        const end = Math.min(totalPages - 1, page + windowSize)

                        add(1)
                        if (start > 2) add('…')
                        for (let n = start; n <= end; n++) add(n)
                        if (end < totalPages - 1) add('…')
                        if (totalPages > 1) add(totalPages)

                        return (
                          <div className="flex items-center gap-2">
                            {items.map((it, idx) =>
                              it === '…' ? (
                                <span key={`ellipsis-${idx}`} className="px-1 text-gray-500">…</span>
                              ) : (
                                <button
                                  key={it}
                                  type="button"
                                  onClick={() => goToPage(it)}
                                  className={[
                                    'px-1 py-0.5 text-sm',
                                    'bg-transparent border-0 rounded-none shadow-none',
                                    'text-[#1C448E]',
                                    // geen hover styles:
                                    'hover:bg-transparent active:bg-transparent',
                                    it === page
                                      ? 'font-semibold border-b-2 border-[#1C448E]'
                                      : 'font-normal border-b-2 border-transparent'
                                  ].join(' ')}
                                  aria-current={it === page ? 'page' : undefined}
                                  aria-label={`Ga naar pagina ${it}`}
                                >
                                  {it}
                                </button>
                              )
                            )}
                          </div>
                        )
                      })()}

                      {/* Volgende */}
                      <button
                        type="button"
                        onClick={() => goToPage(page + 1)}
                        disabled={page === totalPages}
                        className={[
                          'px-2 py-1 text-sm',
                          'text-[#1C448E]',
                          'bg-transparent border-0 rounded-none shadow-none',
                          'focus:outline-none focus:ring-0',
                          page === totalPages ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                        ].join(' ')}
                        aria-label="Volgende pagina"
                      >
                        Volgende
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Mobiele fullscreen filters */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-white flex flex-col"
          role="dialog"
          aria-modal="true"
          style={{ top: `${navOffset}px` }}
        >
          <div className="h-12 flex items-center justify-between px-4">
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

          <div className="flex-1 overflow-y-auto p-4">
            {renderFilters()}
          </div>

          <div className="p-3 bg-white">
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
