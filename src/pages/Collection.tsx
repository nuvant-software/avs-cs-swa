import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Loader from '../components/Loader'
import FilterRangeSlider from '../components/filters/FilterRangeSlider'
import MultiSearchSelect from '../components/filters/MultiSearchSelect'
import CarCard from '../components/CarCard'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'

// ✅ React-Icons
import { TbAlphabetLatin } from "react-icons/tb"
import { MdSpeed, MdDateRange } from "react-icons/md"
import { IoMdPricetags } from "react-icons/io"
import { FaArrowUp, FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa"

// ✅ view toggle icons (geen tekst)
import { FaThList } from "react-icons/fa"
import { RiGalleryView2 } from "react-icons/ri"

// ✅ extra icons voor specs
import { FaGasPump } from "react-icons/fa"
import { FaRoad } from "react-icons/fa"
import { FaCogs } from "react-icons/fa"
import { FaCalendarAlt } from "react-icons/fa"
import { FaBolt } from "react-icons/fa"
import { FaWrench } from "react-icons/fa"

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
const BASE_BODIES = ['Hatchback', 'Sedan', 'Stationwagon', 'SUV', 'MPV', 'Coupé', 'Cabrio', 'Pick-up', 'Bestel']
const BASE_FUELS = ['Benzine', 'Diesel', 'Elektrisch', 'Hybride', 'LPG']
const BASE_DOORS = ['2', '3', '4', '5']

type ViewMode = "grid" | "list"

const formatNumberNL = (n: number) => n.toLocaleString('nl-NL')
const formatPriceEUR = (n: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

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
  const [mobileSortOpen, setMobileSortOpen] = useState(false)

  // Desktop: grid/list toggle
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  // Sort state
  const [sortBy, setSortBy] = useState<SortBy>('brandModelVariant')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // ✅ NEW: pas nadat user echt kiest/togglet, tonen we de gekozen sort label
  const [hasUserSorted, setHasUserSorted] = useState(false)

  // ✅ Mobiel: placeholder tot user echt iets kiest (default sort blijft wel op naam)
  const mobileSortLabel = useMemo(() => {
    if (!hasUserSorted) return "Sorteer op"

    switch (sortBy) {
      case "brandModelVariant":
        return "Merk / Model"
      case "price":
        return "Prijs"
      case "km":
        return "Kilometerstand"
      case "year":
        return "Bouwjaar"
      default:
        return "Merk / Model"
    }
  }, [sortBy, hasUserSorted])

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
              const nested = (record as any).car_overview ?? (record as any).carOverview
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

  // Als een merk wordt gedeselecteerd: verwijder alle modellen van die merken
  useEffect(() => {
    setModelSelected((sel) =>
      sel.filter((token) => {
        const [b] = token.split(' — ')
        return brandSelected.includes(b)
      })
    )
  }, [brandSelected])

  // Als (merk, model) niet meer bestaat in modelSelected: verwijder varianten daarvan
  useEffect(() => {
    setVariantSelected((sel) =>
      sel.filter((token) => {
        const [b, m] = token.split(' — ')
        return modelSelected.includes(`${b} — ${m}`)
      })
    )
  }, [modelSelected])

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
  const PAGE_SIZE = 12
  const [page, setPage] = useState(1)

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(gridCardData.length / PAGE_SIZE))
  }, [gridCardData.length])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
    if (page < 1) setPage(1)
  }, [page, totalPages])

  const pageStartIndex = (page - 1) * PAGE_SIZE
  const pageEndIndex = Math.min(page * PAGE_SIZE, gridCardData.length)

  const pagedGridData = useMemo(() => {
    return gridCardData.slice(pageStartIndex, pageEndIndex)
  }, [gridCardData, pageStartIndex, pageEndIndex])

  const pagedListData = pagedGridData

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

  // ✅ NO borders / NO backgrounds / NO outlines on click
  const btnReset =
    "!bg-transparent !border-0 !shadow-none !ring-0 !outline-none appearance-none " +
    "focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 " +
    "active:!outline-none active:!ring-0"

  // Sort pill: inactief grijs/zwart, actief blauw + semi-bold
  const SortPill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        btnReset,
        "inline-flex items-center gap-1 px-1.5 py-1 text-sm",
        active ? "text-[#1C448E] font-semibold" : "text-gray-700 font-normal hover:text-gray-900",
      ].join(" ")}
    >
      {children}
    </button>
  )

  const renderSortPills = () => (
    <div className="flex items-center gap-4">
      <SortPill
        active={sortBy === 'brandModelVariant'}
        onClick={() => {
          setSortBy('brandModelVariant')
          setHasUserSorted(true)
        }}
      >
        <TbAlphabetLatin size={22} />
      </SortPill>

      <SortPill
        active={sortBy === 'price'}
        onClick={() => {
          setSortBy('price')
          setHasUserSorted(true)
        }}
      >
        <IoMdPricetags size={22} />
        Prijs
      </SortPill>

      <SortPill
        active={sortBy === 'km'}
        onClick={() => {
          setSortBy('km')
          setHasUserSorted(true)
        }}
      >
        <MdSpeed size={22} />
        km
      </SortPill>

      <SortPill
        active={sortBy === 'year'}
        onClick={() => {
          setSortBy('year')
          setHasUserSorted(true)
        }}
      >
        <MdDateRange size={22} />
        Jaar
      </SortPill>
    </div>
  )

  const renderFilters = () => (
    <>
      <div className="mb-4">
        <MultiSearchSelect label="Merk" options={brandOptions} selected={brandSelected} onChange={setBrandSelected} />
      </div>

      <div className="mb-4">
        <MultiSearchSelect
          label="Model"
          options={modelOptions}
          selected={modelSelected}
          onChange={setModelSelected}
          disabled={!brandSelected.length}
        />
      </div>

      <div className="mb-4">
        <MultiSearchSelect
          label="Variant"
          options={variantOptions}
          selected={variantSelected}
          onChange={setVariantSelected}
          disabled={!modelSelected.length}
        />
      </div>

      <div className="mb-4">
        <FilterRangeSlider label="Prijs" min={priceBounds[0]} max={priceBounds[1]} value={priceRange} onChange={setPriceRange} />
      </div>

      <div className="mb-6">
        <FilterRangeSlider label="Kilometerstand" min={kmBounds[0]} max={kmBounds[1]} value={kmRange} onChange={setKmRange} />
      </div>

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

  // Handler voor mobiele sort dropdown
  const handleMobileSortSelect = (value: SortBy) => {
    setSortBy(value)
    setHasUserSorted(true)
    setMobileSortOpen(false)
  }

  // ✅ ListRow (3 blokken)
  const ListRow: React.FC<{ data: GridCardData }> = ({ data }) => {
    const car = data.car
    const folder = (data.imageFolder && data.imageFolder.trim().length) ? data.imageFolder : FALLBACK_IMAGE_FOLDER

    // 3 foto's (gallery-idee)
    const imgs = [
      `/images/cars/${folder}/1.jpg`,
      `/images/cars/${folder}/2.jpg`,
      `/images/cars/${folder}/3.jpg`,
    ]

    const title = `${car.brand} ${car.model} ${car.variant}`.trim()

    const specItem = (icon: React.ReactNode, label: string) => (
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <span className="text-gray-500">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
    )

    return (
      <div
        className={[
          "w-full",
          "rounded-2xl border border-gray-200 bg-white",
          "shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
          "overflow-hidden",
        ].join(" ")}
      >
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr_220px]">
          {/* [1] FOTO + 3 BALKJES */}
          <div className="relative bg-gray-100">
            <div className="aspect-[4/3] md:aspect-auto md:h-full w-full overflow-hidden">
              <img
                src={imgs[0]}
                alt={title}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // fallback naar algemeen plaatje
                  ;(e.currentTarget as HTMLImageElement).src = `/images/cars/${FALLBACK_IMAGE_FOLDER}/1.jpg`
                }}
              />
            </div>

            {/* 3 balkjes (zoals gallery) */}
            <div className="absolute left-3 right-3 bottom-3 flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={[
                    "h-1.5 flex-1 rounded-full",
                    i === 0 ? "bg-white/90" : "bg-white/40",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>

          {/* [2] TITEL + 6 SPECS */}
          <div className="p-4 md:p-5">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 leading-snug">
              {title}
            </h3>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {specItem(<FaGasPump className="text-[14px]" />, car.fuel || 'Onbekend')}
              {specItem(<FaRoad className="text-[14px]" />, `${formatNumberNL(car.mileage || 0)} km`)}
              {specItem(<FaCogs className="text-[14px]" />, car.transmission || 'Onbekend')}
              {specItem(<FaCalendarAlt className="text-[14px]" />, `${car.year || 0}`)}
              {specItem(<FaBolt className="text-[14px]" />, `${car.pk || 0} pk`)}
              {specItem(<FaWrench className="text-[14px]" />, (car.engine_size && car.engine_size.trim().length) ? car.engine_size : '—')}
            </div>
          </div>

          {/* [3] PRIJS + BUTTON */}
          <div className="p-4 md:p-5 border-t md:border-t-0 md:border-l border-gray-200 flex md:flex-col items-start md:items-end justify-between gap-3">
            <div className="text-left md:text-right w-full">
              <div className="text-xs text-gray-500">Prijs</div>
              <div className="text-lg md:text-xl font-bold text-gray-900">
                {formatPriceEUR(car.price || 0)}
              </div>
            </div>

            <button
              type="button"
              className={[
                btnReset,
                "inline-flex items-center justify-center",
                "rounded-xl px-3 py-2 text-sm font-medium",
                "text-[#1C448E]",
                "border border-[#1C448E]/40", // ✅ kleine blauwe rand
                "hover:border-[#1C448E] hover:bg-[#1C448E]/5",
                "transition",
                "w-full md:w-auto",
              ].join(" ")}
              aria-label={`Meer weten over ${title}`}
            >
              Meer weten
            </button>
          </div>
        </div>
      </div>
    )
  }

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
            {/* Mobiele filter- & sort-topbar */}
            {!mobileFiltersOpen && (
              <div className="md:hidden sticky z-30 bg-white border-b border-gray-200" style={{ top: `${navOffset}px` }}>
                <div className="flex items-center px-4 py-2 [-webkit-overflow-scrolling:touch]">
                  {/* Filters-knop links */}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileFiltersOpen(true)
                      setMobileSortOpen(false)
                    }}
                    aria-label="Open filters"
                    className={[
                      btnReset,
                      "inline-flex items-center gap-2 text-sm text-[#1C448E]",
                      "shrink-0",
                    ].join(" ")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 -mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M3 6h18M6 12h12M10 18h4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Filters
                  </button>

                  <div className="flex-1" />

                  {/* Sort controls rechts */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Custom dropdown voor sorteer-optie */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMobileSortOpen(o => !o)}
                        className={[
                          btnReset,
                          "inline-flex items-center gap-1 text-sm text-[#1C448E]",
                        ].join(" ")}
                      >
                        {/* ✅ placeholder tot user echt kiest */}
                        <span>{mobileSortLabel}</span>
                        <FaChevronDown
                          className={[
                            "transition-transform duration-150",
                            mobileSortOpen ? "rotate-180" : "rotate-0",
                          ].join(" ")}
                          size={12}
                        />
                      </button>

                      {mobileSortOpen && (
                        <div className="absolute right-0 mt-1 w-40 rounded-md border border-gray-200 bg-white shadow-lg text-sm z-40">
                          <button
                            type="button"
                            onClick={() => handleMobileSortSelect('brandModelVariant')}
                            className={[
                              btnReset,
                              "block w-full text-left px-3 py-1.5 hover:bg-gray-100",
                              sortBy === 'brandModelVariant' ? "font-semibold text-[#1C448E]" : "text-gray-800",
                            ].join(" ")}
                          >
                            Merk / Model
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMobileSortSelect('price')}
                            className={[
                              btnReset,
                              "block w-full text-left px-3 py-1.5 hover:bg-gray-100",
                              sortBy === 'price' ? "font-semibold text-[#1C448E]" : "text-gray-800",
                            ].join(" ")}
                          >
                            Prijs
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMobileSortSelect('km')}
                            className={[
                              btnReset,
                              "block w-full text-left px-3 py-1.5 hover:bg-gray-100",
                              sortBy === 'km' ? "font-semibold text-[#1C448E]" : "text-gray-800",
                            ].join(" ")}
                          >
                            Kilometerstand
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMobileSortSelect('year')}
                            className={[
                              btnReset,
                              "block w-full text-left px-3 py-1.5 hover:bg-gray-100",
                              sortBy === 'year' ? "font-semibold text-[#1C448E]" : "text-gray-800",
                            ].join(" ")}
                          >
                            Bouwjaar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Richtingspijl sorteer-volgorde */}
                    <button
                      type="button"
                      onClick={() => {
                        setHasUserSorted(true)
                        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
                      }}
                      aria-label="Draai sorteer volgorde"
                      className={[
                        btnReset,
                        "inline-flex items-center text-sm",
                        "text-[#1C448E]",
                      ].join(" ")}
                    >
                      <FaArrowUp className={sortDir === 'desc' ? 'rotate-180' : ''} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ Desktop sticky bar */}
            <div
              className="hidden md:flex sticky bg-white z-20 px-6 lg:px-8 py-3"
              style={{ top: `${navOffset}px` }}
            >
              <div className="w-full flex items-end justify-between gap-6">
                {/* LEFT: results + sort */}
                <div className="flex flex-col gap-2 min-w-0">
                  <span className="text-sm text-gray-700">
                    {gridCardData.length === 0
                      ? '0 resultaten'
                      : `${pageStartIndex + 1}–${pageEndIndex} van ${gridCardData.length} resultaten`}
                  </span>

                  <div className="flex items-center gap-4">
                    {renderSortPills()}

                    <button
                      type="button"
                      onClick={() => {
                        setHasUserSorted(true)
                        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
                      }}
                      aria-label="Draai sorteer volgorde"
                      title="Draai sorteer volgorde"
                      className={[
                        btnReset,
                        "text-sm",
                        sortDir ? "text-gray-700 hover:text-gray-900" : "text-gray-700",
                        "transition-transform duration-200",
                      ].join(" ")}
                    >
                      <FaArrowUp className={sortDir === 'desc' ? 'rotate-180' : 'rotate-0'} />
                    </button>
                  </div>
                </div>

                {/* RIGHT: view icons */}
                <div className="flex items-center gap-3 shrink-0 pb-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={[
                      btnReset,
                      "transition-opacity hover:opacity-90",
                      viewMode === "grid" ? "text-[#1C448E]" : "text-gray-500 hover:text-gray-700",
                    ].join(" ")}
                    aria-pressed={viewMode === "grid"}
                    aria-label="Grid weergave"
                    title="Grid"
                  >
                    <RiGalleryView2 size={22} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={[
                      btnReset,
                      "transition-opacity hover:opacity-90",
                      viewMode === "list" ? "text-[#1C448E]" : "text-gray-500 hover:text-gray-700",
                    ].join(" ")}
                    aria-pressed={viewMode === "list"}
                    aria-label="Lijst weergave"
                    title="Lijst"
                  >
                    <FaThList size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="px-4 md:px-6 lg:px-8 pb-8">
              <div ref={gridTopRef} />
              {gridCardData.length === 0 ? (
                <div className="border rounded-xl p-8 text-center text-gray-600 bg-white">
                  Geen resultaten met de huidige filters.
                </div>
              ) : (
                <>
                  {/* MOBILE: nu ook dezelfde 3-blokken list */}
                  <div className="md:hidden">
                    <div className="flex flex-col gap-4">
                      <AnimatePresence initial={false} mode="popLayout">
                        {pagedListData.map((data) => (
                          <motion.div
                            key={data.id}
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            transition={{ duration: 0.18 }}
                          >
                            <ListRow data={data} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* DESKTOP: toggle */}
                  <div className="hidden md:block">
                    {viewMode === "grid" ? (
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
                    ) : (
                      // ✅ LIST VIEW: scale-in bij switchen + 3-blokken layout
                      <div className="flex flex-col gap-4">
                        <AnimatePresence initial={false} mode="popLayout">
                          {pagedListData.map((data) => (
                            <motion.div
                              key={data.id}
                              initial={{ opacity: 0, y: 12, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 12, scale: 0.96 }}
                              transition={{ duration: 0.18 }}
                            >
                              <ListRow data={data} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-2 select-none">
                      {/* Vorige */}
                      <button
                        type="button"
                        onClick={() => goToPage(page - 1)}
                        disabled={page === 1}
                        className={[
                          btnReset,
                          "px-2 py-1 text-sm",
                          page === 1 ? "opacity-40 cursor-not-allowed text-gray-500" : "cursor-pointer text-[#1C448E]",
                        ].join(" ")}
                        aria-label="Vorige pagina"
                      >
                        <FaChevronLeft className="inline-block align-[-2px]" size={16} />
                        <span className="sr-only">Vorige</span>
                      </button>

                      {/* Nummers */}
                      {(() => {
                        const items: (number | "…")[] = []
                        const add = (n: number | "…") => items.push(n)
                        const windowSize = 1
                        const start = Math.max(2, page - windowSize)
                        const end = Math.min(totalPages - 1, page + windowSize)

                        add(1)
                        if (start > 2) add("…")
                        for (let n = start; n <= end; n++) add(n)
                        if (end < totalPages - 1) add("…")
                        if (totalPages > 1) add(totalPages)

                        return (
                          <div className="flex items-center gap-2">
                            {items.map((it, idx) =>
                              it === "…" ? (
                                <span key={`ellipsis-${idx}`} className="px-1 text-gray-500">…</span>
                              ) : (
                                <button
                                  key={it}
                                  type="button"
                                  onClick={() => goToPage(it)}
                                  className={[
                                    btnReset,
                                    "px-1 py-0.5 text-sm",
                                    it === page ? "text-[#1C448E] font-semibold" : "text-gray-700 hover:text-gray-900",
                                  ].join(" ")}
                                  aria-current={it === page ? "page" : undefined}
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
                          btnReset,
                          "px-2 py-1 text-sm",
                          page === totalPages ? "opacity-40 cursor-not-allowed text-gray-500" : "cursor-pointer text-[#1C448E]",
                        ].join(" ")}
                        aria-label="Volgende pagina"
                      >
                        <FaChevronRight className="inline-block align-[-2px]" size={16} />
                        <span className="sr-only">Volgende</span>
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
