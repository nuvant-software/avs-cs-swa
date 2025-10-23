import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Loader from '../components/Loader'
import FilterRangeSlider from '../components/filters/FilterRangeSlider'
import MultiSearchSelect from '../components/filters/MultiSearchSelect'
import CarCard from '../components/CarCard'

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
  order: number
}

type AnimatedGridEntry = {
  id: string
  car: GridCar
  imageFolder?: string
  status: 'enter' | 'present' | 'exit'
  order: number
  animationDelay: number
}

const FALLBACK_IMAGE_FOLDER = 'car_001'

const buildStableId = (car: CarOverview, fallbackIndex: number): string => {
  const raw = [car.id, car.sourceId].find(value => typeof value === 'string' && value.trim().length)
  if (raw) {
    return raw.trim()
  }

  return [
    car.brand,
    car.model,
    car.variant,
    car.price,
    car.km ?? 'km?',
    car.pk ?? 'pk?',
    car.transmission ?? 'trans?',
    fallbackIndex,
  ].join('|')
}

const mapCarToGridData = (car: CarOverview, index: number): GridCardData => {
  const id = buildStableId(car, index)
  const card: GridCar = {
    id,
    brand: car.brand,
    model: car.model,
    variant: car.variant,
    fuel: car.fuel || 'Onbekend',
    mileage: typeof car.km === 'number' ? car.km : 0,
    transmission: car.transmission || 'Onbekend',
    price: car.price,
    year: car.year ?? 0,
    engine_size: car.engine_size || '',
    pk: typeof car.pk === 'number' ? car.pk : 0,
  }

  const imageFolder = car.imageFolder && car.imageFolder.trim().length ? car.imageFolder.trim() : FALLBACK_IMAGE_FOLDER

  return {
    id,
    car: card,
    imageFolder,
    order: index,
  }
}

const pickString = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length) {
        return trimmed
      }
    }
  }
  return undefined
}

const pickNumber = (record: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length) {
        const parsed = Number(trimmed)
        if (!Number.isNaN(parsed)) {
          return parsed
        }
      }
    }
  }
  return undefined
}

const ensureStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []

type AnimatedGridCardProps = {
  entry: AnimatedGridEntry
  prefersReducedMotion: boolean
  onExitComplete: (id: string) => void
}

const AnimatedGridCard: React.FC<AnimatedGridCardProps> = ({ entry, prefersReducedMotion, onExitComplete }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [measuredHeight, setMeasuredHeight] = useState<number>(() => 1)

  useLayoutEffect(() => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMeasuredHeight(Math.max(1, Math.ceil(rect.height)))
  }, [entry.car])

  useEffect(() => {
    if (!cardRef.current || typeof ResizeObserver === 'undefined') return
    const node = cardRef.current
    const observer = new ResizeObserver(entries => {
      entries.forEach(en => {
        const next = Math.max(1, Math.ceil(en.contentRect.height))
        setMeasuredHeight(prev => (Math.abs(prev - next) > 1 ? next : prev))
      })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (prefersReducedMotion && entry.status === 'exit') {
      onExitComplete(entry.id)
      return
    }

    if (prefersReducedMotion || entry.status !== 'exit') return

    const node = containerRef.current
    if (!node) return

    const handle = (event: TransitionEvent) => {
      if (event.propertyName === 'max-height') {
        onExitComplete(entry.id)
      }
    }

    node.addEventListener('transitionend', handle)
    return () => node.removeEventListener('transitionend', handle)
  }, [entry.id, entry.status, onExitComplete, prefersReducedMotion])

  const containerStyle = prefersReducedMotion
    ? { order: entry.order }
    : { order: entry.order, maxHeight: entry.status === 'exit' ? '0px' : `${Math.max(1, measuredHeight)}px` }

  const containerClassName = [
    'overflow-hidden w-full max-w-[340px] justify-self-start',
    prefersReducedMotion ? '' : 'transition-[max-height,opacity] duration-500 ease-out',
    entry.status === 'exit' && !prefersReducedMotion ? 'opacity-0' : 'opacity-100',
  ]
    .filter(Boolean)
    .join(' ')

  const motionClassName = [
    'will-change-transform will-change-opacity',
    prefersReducedMotion ? '' : 'transition duration-[420ms] ease-out',
    entry.status === 'exit' && !prefersReducedMotion ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100',
  ]
    .filter(Boolean)
    .join(' ')

  const cardDelay = !prefersReducedMotion && entry.status === 'enter' ? entry.animationDelay : 0
  const transitionStyle = cardDelay ? { transitionDelay: `${cardDelay}ms` } : undefined

  return (
    <div ref={containerRef} className={containerClassName} style={containerStyle}>
      <div className="flex justify-start">
        <div ref={cardRef} className={motionClassName} style={transitionStyle}>
          <CarCard
            car={entry.car}
            layout="grid"
            imageFolder={entry.imageFolder}
            animationDelay={cardDelay}
          />
        </div>
      </div>
    </div>
  )
}

const usePrefersReducedMotion = () => {
  const [prefers, setPrefers] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (event: MediaQueryListEvent) => setPrefers(event.matches)
    setPrefers(media.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  return prefers
}

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
  const [pkSelected, setPkSelected] = useState<string[]>([])
  const [bodySelected, setBodySelected] = useState<string[]>([])
  const [transSelected, setTransSelected] = useState<string[]>([])
  const [doorsSelected, setDoorsSelected] = useState<string[]>([])

  // Helpers
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
              if (nested && typeof nested === 'object') {
                return nested as Record<string, unknown>
              }
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
    baseAfterBMVAndSliders.forEach(c => { if (typeof c.pk === 'number' && !Number.isNaN(c.pk)) set.add(String(c.pk)) })
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
    baseAfterBMVAndSliders.forEach(c => { if (typeof c.doors === 'number' && !Number.isNaN(c.doors)) set.add(String(c.doors)) })
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

  const gridCardData = useMemo(() => filteredCars.map((car, index) => mapCarToGridData(car, index)), [filteredCars])

  const [gridEntries, setGridEntries] = useState<AnimatedGridEntry[]>([])

  useEffect(() => {
    setGridEntries(prev => {
      const prevById = new Map(prev.map(entry => [entry.id, entry]))
      const nextEntries: AnimatedGridEntry[] = []

      gridCardData.forEach((item, index) => {
        const existing = prevById.get(item.id)
        if (existing) {
          prevById.delete(item.id)
          const status = existing.status === 'exit' ? 'enter' : 'present'
          nextEntries.push({
            ...existing,
            car: item.car,
            imageFolder: item.imageFolder,
            order: item.order,
            status,
            animationDelay: status === 'enter' ? Math.min(index, 8) * 80 : 0,
          })
        } else {
          nextEntries.push({
            id: item.id,
            car: item.car,
            imageFolder: item.imageFolder,
            order: item.order,
            status: 'enter',
            animationDelay: Math.min(index, 8) * 80,
          })
        }
      })

      prevById.forEach(entry => {
        if (entry.status === 'exit') {
          nextEntries.push(entry)
        } else {
          nextEntries.push({ ...entry, status: 'exit', animationDelay: 0 })
        }
      })

      return nextEntries.sort((a, b) => {
        if (a.order === b.order) {
          if (a.status === b.status) return a.id.localeCompare(b.id)
          if (a.status === 'exit') return 1
          if (b.status === 'exit') return -1
        }
        return a.order - b.order
      })
    })
  }, [gridCardData])

  const handleCardExitComplete = useCallback((id: string) => {
    setGridEntries(prev => prev.filter(entry => entry.id !== id))
  }, [])

  const prefersReducedMotion = usePrefersReducedMotion()

  // ───────── NAVBAR overlay ↔ solid ─────────
  const heroEndRef = useRef<HTMLDivElement | null>(null)
  const [navBottom, setNavBottom] = useState<number>(NAV_HEIGHT_FALLBACK)
  const [navSolid, setNavSolid] = useState<boolean>(false)
  const navOffset = Math.max(navBottom, NAV_HEIGHT_FALLBACK)

  // luister naar metingen van Navbar + vraag initiale meting op
  useEffect(() => {
    const onMetrics = (e: Event) => {
      const ce = e as CustomEvent<{ bottom: number; height: number; mode: 'overlay' | 'solid' }>
      if (ce?.detail?.bottom) setNavBottom(ce.detail.bottom)
    }
    window.addEventListener('avs:nav-metrics', onMetrics)
    window.dispatchEvent(new Event('avs:request-nav-metrics'))
    return () => window.removeEventListener('avs:nav-metrics', onMetrics)
  }, [])

  // wissel navbar-mode precies wanneer de content onder de onderrand van de navbar schuift
  useEffect(() => {
    const el = heroEndRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        const solid = !entry.isIntersecting
        setNavSolid(solid)
        window.dispatchEvent(new CustomEvent('avs:nav-mode', { detail: { mode: solid ? 'solid' : 'overlay' } }))
      },
      {
        threshold: 0,
        root: null,
        // cruciaal: compenseren voor de onderrand van de navbar
        rootMargin: `-${Math.max(0, navOffset)}px 0px 0px 0px`,
      }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [navOffset])

  if (loading) return <Loader />
  if (error) return <Loader />

  // UI: filters render
  const renderFilters = () => (
    <>
      <h2 className="text-lg font-semibold mb-3">Filters</h2>

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

      <div className="mb-4">
        <MultiSearchSelect label="PK" options={pkOptions} selected={pkSelected} onChange={setPkSelected} />
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
      {/* HERO: loopt onder overlay-navbar door */}
      <section className="relative">
        <div className="h-40 md:h-56 lg:h-64 w-full bg-center bg-cover" style={{ backgroundImage: `url('/images/collection-hero.jpg')` }} />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex items-center">
          <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8">
            <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold drop-shadow">Collectie</h1>
          </div>
        </div>
      </section>

      {/* Sentinel: begin van content */}
      <div ref={heroEndRef} aria-hidden className="h-0" />

      {/* CONTENT */}
      <div className="w-full max-w-screen-2xl mx-auto" style={{ paddingTop: navSolid ? `${navOffset}px` : 0 }}>
        <div className="grid grid-cols-1 md:grid-cols-[33%_67%] lg:grid-cols-[minmax(260px,360px)_1fr]">
          {/* Sidebar (md+) */}
          <aside className="hidden md:block border-r border-gray-200">
            <div className="sticky p-4 bg-white" style={{ top: `${navOffset}px` }}>
              {renderFilters()}
            </div>
          </aside>

          {/* Resultaten */}
          <section className="min-w-0">
            {/* Mobiel: sticky filter-knop exact onder navbar */}
            {!mobileFiltersOpen && (
              <div
                className="md:hidden sticky z-30 bg-white/95 backdrop-blur-sm border-b"
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
                  <div className="text-sm text-gray-600">{filteredCars.length} resultaten</div>
                </div>
              </div>
            )}

            {/* Teller (md+) */}
            <div className="hidden md:flex items-center justify-end px-6 lg:px-8 mb-4 md:mb-6">
              <div className="text-sm text-gray-600">{filteredCars.length} resultaten</div>
            </div>

            {/* Cards grid – schaalt op grote schermen */}
            <div className="px-4 md:px-6 lg:px-8 pb-8">
              {filteredCars.length === 0 && gridEntries.length === 0 ? (
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
                      fuel: (c as any).fuel || (c as any).brandstof || 'Onbekend',
                      mileage: typeof c.km === 'number' ? c.km : (c as any).mileage || 0,
                      transmission: c.transmission || (c as any).gearbox || 'Onbekend',
                      price: c.price,
                      year: (c as any).year || (c as any).bouwjaar || 0,
                      engine_size: (c as any).engine_size || (c as any).motorinhoud || '',
                      pk: typeof c.pk === 'number' ? c.pk : (c as any).pk || 0,
                    }
                    return (
                      <CarCard
                        key={mappedCar.id}
                        car={mappedCar}
                        layout="grid"
                        imageFolder="car_001"
                        animationDelay={Math.min(idx, 8) * 80}
                      />
                    )})}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Mobiele fullscreen filters (start onder navbar) */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-white flex flex-col"
          role="dialog"
          aria-modal="true"
          style={{ top: `${navOffset}px` }}
        >
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

          <div className="flex-1 overflow-y-auto p-4">
            {renderFilters()}
          </div>

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
