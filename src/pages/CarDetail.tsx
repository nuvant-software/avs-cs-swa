import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import CarCard from "../components/CarCard"
import { Lightbox } from "../components/Lightbox"

type ApiItem = Record<string, any>

type CarOverview = {
  id?: string
  sourceId?: string

  brand: string
  model: string
  body?: string
  price: number
  description?: string

  condition?: string
  stock_number?: string
  vin_number?: string
  year?: number
  mileage?: number
  transmission?: string
  engine_size?: string
  driver_type?: string
  cylinders?: number
  fuel?: string
  doors?: number
  color?: string
  seats?: number
  pk?: number
  variant?: string
  registration?: string

  imageFolder?: string
  pictures?: string

  safety_features?: string[]
  exterior_features?: string[]
  interior_features?: string[]
  convenience_features?: string[]
  [key: string]: any
}

type GridCar = {
  id: string
  brand: string
  model: string
  variant: string
  fuel: string
  mileage: number
  transmission: string
  price: number
  year: number
  engine_size: string
  pk: number
}

type GridCardData = {
  id: string
  car: GridCar
  imageFolder?: string
  raw: CarOverview
}

const FALLBACK_IMAGE_FOLDER = "car_001"

// ✅ tijdelijk: altijd car_001
const STATIC_FOLDER = "car_001"
const STATIC_COUNT = 5
const buildStaticImageUrls = () =>
  Array.from({ length: STATIC_COUNT }, (_, i) => {
    const n = i + 1
    return `https://avsapisa.blob.core.windows.net/carimages/${STATIC_FOLDER}/foto-${n}.jpg`
  })

const getRegYear = (reg?: string): number | undefined => {
  const m = String(reg ?? "").match(/(\d{4})$/)
  return m ? Number(m[1]) : undefined
}

const pickString = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed.length) return trimmed
    }
  }
  return undefined
}

const pickNumber = (record: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && !Number.isNaN(value)) return value
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed.length) {
        const parsed = Number(trimmed)
        if (!Number.isNaN(parsed)) return parsed
      }
    }
  }
  return undefined
}

const buildStableId = (car: CarOverview): string => {
  const raw = [car.id, car.sourceId].find((v) => typeof v === "string" && v.trim().length)
  if (raw) return raw!.trim()
  return [
    (car.brand || "").trim().toLowerCase(),
    (car.model || "").trim().toLowerCase(),
    (car.variant || "").trim().toLowerCase(),
    String(car.year ?? ""),
    (car.transmission || "").trim().toLowerCase(),
    (car.engine_size || "").trim().toLowerCase(),
    (car.fuel || "").trim().toLowerCase(),
  ].join("|")
}

const mapCarToGridData = (car: CarOverview): GridCardData => {
  const id = buildStableId(car)
  const card: GridCar = {
    id,
    brand: car.brand,
    model: car.model,
    variant: car.variant || "",
    fuel: car.fuel || "Onbekend",
    mileage: typeof car.mileage === "number" ? car.mileage : 0,
    transmission: car.transmission || "Onbekend",
    price: car.price,
    year: car.year ?? 0,
    engine_size: car.engine_size || "",
    pk: typeof car.pk === "number" ? car.pk : 0,
  }

  const folder = car.imageFolder && car.imageFolder.trim().length ? car.imageFolder.trim() : FALLBACK_IMAGE_FOLDER
  return { id, car: card, imageFolder: folder, raw: car }
}

const picturesToFolder = (pictures?: string): string | undefined => {
  if (!pictures) return undefined
  const m = pictures.match(/\/(\d{3})\/?$/)
  if (!m) return undefined
  return `car_${m[1]}`
}

const preloadImage = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject()
    img.src = src
  })

const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-2xl bg-gray-100 ${className}`} />
)

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase()
const normId = (v: unknown) => norm(v).replace(/\s+/g, "")

export default function CarDetail() {
  const params = useParams()
  const routeIdRaw = (params.id ?? params.carId ?? params.slug ?? "").trim()
  const routeId = (() => {
    try {
      return decodeURIComponent(routeIdRaw)
    } catch {
      return routeIdRaw
    }
  })()

  const [cars, setCars] = useState<CarOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [images, setImages] = useState<string[]>([])
  const [slide, setSlide] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [pageReady, setPageReady] = useState(false)

  const [activeTab, setActiveTab] = useState<"kenmerken" | "opties">("kenmerken")
  const simWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    fetch("/api/filter_cars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: {}, includeItems: true }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data: { items?: unknown[] }) => {
        const items = Array.isArray(data.items) ? data.items : []

        const mapped: CarOverview[] = items
          .map((item) => {
            if (!item || typeof item !== "object") return null

            const root = item as ApiItem
            const nested = root.car_overview ?? root.carOverview
            const base = (nested && typeof nested === "object" ? nested : root) as ApiItem

            const rootId = pickString(root, ["id", "_id", "car_id", "carId", "slug", "vin"])
            const overviewId = pickString(base, ["id", "vin_number", "vin", "_id"])

            const brand = pickString(base, ["brand"]) ?? ""
            const model = pickString(base, ["model"]) ?? ""
            const variant = pickString(base, ["variant"]) ?? ""
            const body = pickString(base, ["body", "carrosserie"]) ?? undefined

            const price = pickNumber(base, ["price"]) ?? 0
            const year = pickNumber(base, ["year"]) ?? undefined
            const mileage = pickNumber(base, ["mileage", "km", "kilometers"]) ?? undefined
            const pk = pickNumber(base, ["pk"]) ?? undefined

            const transmission = pickString(base, ["transmission"]) ?? undefined
            const engine_size = pickString(base, ["engine_size"]) ?? undefined
            const fuel = pickString(base, ["fuel"]) ?? undefined
            const doors = pickNumber(base, ["doors"]) ?? undefined

            const description = pickString(base, ["description", "beschrijving", "omschrijving"]) ?? undefined
            const condition = pickString(base, ["condition"]) ?? undefined
            const stock_number = pickString(base, ["stock_number"]) ?? undefined
            const vin_number = pickString(base, ["vin_number"]) ?? undefined
            const driver_type = pickString(base, ["driver_type"]) ?? undefined
            const color = pickString(base, ["color"]) ?? undefined
            const seats = pickNumber(base, ["seats"]) ?? undefined
            const cylinders = pickNumber(base, ["cylinders"]) ?? undefined
            const registration = pickString(root, ["registration"]) ?? undefined

            const imageFolder =
              pickString(base, ["imageFolder", "image_folder", "folder", "imagefolder"]) ??
              picturesToFolder(pickString(base, ["pictures"])) ??
              undefined

            const safety_features = Array.isArray(root.safety_features) ? root.safety_features : undefined
            const exterior_features = Array.isArray(root.exterior_features) ? root.exterior_features : undefined
            const interior_features = Array.isArray(root.interior_features) ? root.interior_features : undefined
            const convenience_features = Array.isArray(root.convenience_features) ? root.convenience_features : undefined

            const final: CarOverview = {
              id: rootId ?? overviewId,
              sourceId: rootId ?? overviewId,
              registration,

              brand,
              model,
              variant,
              body,
              price,
              year,
              mileage,
              transmission,
              engine_size,
              fuel,
              doors,
              pk,

              description,
              condition,
              stock_number,
              vin_number,
              driver_type,
              color,
              seats,
              cylinders,

              imageFolder,
              pictures: pickString(base, ["pictures"]),

              safety_features,
              exterior_features,
              interior_features,
              convenience_features,
            }

            if (!final.brand || !final.model || !final.variant || typeof final.price !== "number") return null
            return final
          })
          .filter((x): x is CarOverview => !!x)

        setCars(mapped)
      })
      .catch((err) => setError(err?.message || "Onbekende fout"))
      .finally(() => setLoading(false))
  }, [])

  const car = useMemo(() => {
    if (!routeId) return null
    const ridRaw = String(routeId).trim()
    const rid = normId(ridRaw)

    const direct = cars.find((c) => normId(c.id) === rid || normId(c.sourceId) === rid)
    if (direct) return direct

    const stableExact = cars.find((c) => normId(buildStableId(c)) === rid)
    if (stableExact) return stableExact

    if (ridRaw.includes("|")) {
      const parts = ridRaw.split("|").map((p) => p.trim())
      const [pBrand, pModel, pVariant, pYear, pTrans, pEngine, pFuel] = parts

      const routeYear = Number(pYear)
      const hasRouteYear = Number.isFinite(routeYear)

      const score = (c: CarOverview) => {
        let s = 0
        if (norm(c.brand) === norm(pBrand)) s += 3
        if (norm(c.model) === norm(pModel)) s += 3
        if (norm(c.variant) === norm(pVariant)) s += 3
        if (norm(c.transmission) === norm(pTrans)) s += 2
        if (norm(c.engine_size) === norm(pEngine)) s += 2
        if (norm(c.fuel) === norm(pFuel)) s += 2

        if (hasRouteYear) {
          const carYear = typeof c.year === "number" ? c.year : undefined
          const regYear = getRegYear(c.registration)
          if (carYear === routeYear || regYear === routeYear) s += 2
          else if (carYear && Math.abs(carYear - routeYear) <= 1) s += 1
          else if (regYear && Math.abs(regYear - routeYear) <= 1) s += 1
        }
        return s
      }

      let best: CarOverview | null = null
      let bestScore = -1
      for (const c of cars) {
        const s = score(c)
        if (s > bestScore) {
          bestScore = s
          best = c
        }
      }
      if (best && bestScore >= 8) return best
    }

    const byVin = cars.find((c) => normId(c.vin_number ?? c.id) === rid)
    if (byVin) return byVin

    const byStock = cars.find((c) => normId(c.stock_number) === rid)
    if (byStock) return byStock

    return null
  }, [cars, routeId])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setPageReady(false)
      if (!car) return

      const urls = buildStaticImageUrls()
      if (cancelled) return

      setImages(urls)
      setSlide(0)

      if (urls[0]) {
        try {
          await preloadImage(urls[0])
        } catch {
          // ok
        }
      }

      if (!cancelled) setPageReady(true)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [car])

  const hasImages = images.length > 0
  const prev = () => hasImages && setSlide((s) => (s - 1 + images.length) % images.length)
  const next = () => hasImages && setSlide((s) => (s + 1) % images.length)

  const overviewItems: Array<{ label: string; value: string }> = useMemo(() => {
    if (!car) return []
    return [
      { label: "Conditie", value: car.condition ?? "—" },
      { label: "Nummer", value: car.stock_number ?? "—" },
      { label: "VIN", value: car.vin_number ?? car.id ?? "—" },
      { label: "Jaar", value: String(car.year ?? "—") },
      { label: "Kilometerstand", value: `${(car.mileage ?? 0).toLocaleString("nl-NL")} km` },
      { label: "Transmissie", value: car.transmission ?? "—" },
      { label: "Motorinhoud", value: car.engine_size ?? "—" },
      { label: "Aandrijving", value: car.driver_type ?? "—" },
      { label: "Kleur", value: car.color ?? "—" },
      { label: "Brandstof", value: car.fuel ?? "—" },
      { label: "Deuren", value: String(car.doors ?? "—") },
      { label: "Zitplaatsen", value: String(car.seats ?? "—") },
      { label: "PK", value: String(car.pk ?? "—") },
    ]
  }, [car])

  const optionsGroups = useMemo(() => {
    if (!car) return null
    const groups: Array<{ title: string; items: string[] }> = []
    if (car.safety_features?.length) groups.push({ title: "Safety", items: car.safety_features })
    if (car.exterior_features?.length) groups.push({ title: "Exterior", items: car.exterior_features })
    if (car.interior_features?.length) groups.push({ title: "Interior", items: car.interior_features })
    if (car.convenience_features?.length) groups.push({ title: "Convenience", items: car.convenience_features })
    return groups.length ? groups : null
  }, [car])

  const similar = useMemo(() => {
    if (!car) return []
    const list = cars.filter((c) => c !== car)

    const primary = list.filter((c) => {
      const sameBrand = (c.brand || "").toLowerCase() === (car.brand || "").toLowerCase()
      const sameBody = car.body && c.body ? String(c.body).toLowerCase() === String(car.body).toLowerCase() : false
      return sameBrand || sameBody
    })

    const sortNewFirst = (a: CarOverview, b: CarOverview) => (b.year ?? 0) - (a.year ?? 0)
    const base = (primary.length ? primary : list).slice().sort(sortNewFirst)

    return base.slice(0, 8).map(mapCarToGridData)
  }, [cars, car])

  const scrollSimilar = (dir: "left" | "right") => {
    const el = simWrapRef.current
    if (!el) return
    const amount = Math.max(280, Math.floor(el.clientWidth * 0.9))
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <Skeleton className="h-5 w-24" />
        <div className="mt-4">
          <Skeleton className="h-10 w-[60%]" />
          <Skeleton className="h-10 w-40 mt-3 ml-auto" />
        </div>
        <div className="mt-8">
          <Skeleton className="h-[360px] sm:h-[640px] w-full rounded-2xl" />
          <div className="mt-4 flex gap-2 justify-center">
            <Skeleton className="h-16 w-24 rounded-xl" />
            <Skeleton className="h-16 w-24 rounded-xl" />
            <Skeleton className="h-16 w-24 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-10">
        <Link to="/collection" className="underline opacity-80">
          ← Terug naar collectie
        </Link>
        <div className="mt-6 text-red-600 text-sm">{error}</div>
      </div>
    )
  }

  if (!car) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-10">
        <Link to="/collection" className="underline opacity-80">
          ← Terug naar collectie
        </Link>
        <div className="mt-6">
          <div className="font-semibold">Auto niet gevonden.</div>
          <div className="text-sm opacity-70 mt-2">
            routeId: <span className="font-mono">{routeId}</span> • cars geladen: {cars.length}
          </div>
        </div>
      </div>
    )
  }

  const title = `${car.brand} ${car.model}`.trim()
  const topLine = [car.variant, car.body, car.year ? String(car.year) : null].filter(Boolean).join(" • ")

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8 overflow-x-hidden">
      <Link to="/collection" className="inline-flex items-center gap-2 text-sm underline opacity-80">
        ← Terug
      </Link>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-semibold !text-[#1C448E] truncate">{title}</h1>
          {topLine ? <div className="mt-1 text-sm opacity-70">{topLine}</div> : null}
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-xs opacity-60 mb-1">Prijs</div>
          <div className="text-3xl md:text-4xl font-semibold !text-[#1C448E] leading-none">
            € {car.price.toLocaleString("nl-NL")}
          </div>
        </div>
      </div>

      {/* ✅ FOTO: geen border boven, geen grijs zichtbaar, foto forced 16:9 cover */}
      <div className="mt-8">
        {!pageReady ? (
          <>
            <Skeleton className="h-[360px] sm:h-[640px] w-full rounded-2xl" />
            <div className="mt-4 flex gap-2 justify-center">
              <Skeleton className="h-16 w-24 rounded-xl" />
              <Skeleton className="h-16 w-24 rounded-xl" />
              <Skeleton className="h-16 w-24 rounded-xl" />
            </div>
          </>
        ) : (
          <>
            <div className="relative w-full">
              {/* frame: geen border, geen bg */}
              <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden !bg-transparent">
                {hasImages ? (
                  <>
                    <div
                      className="flex w-full h-full transition-transform duration-500 ease-in-out"
                      style={{ transform: `translateX(-${slide * 100}%)` }}
                    >
                      {images.map((src, i) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setLightboxOpen(true)}
                          aria-label={`Open foto ${i + 1}`}
                          className="relative w-full h-full flex-shrink-0 !p-0 !m-0 !bg-transparent overflow-hidden"
                        >
                          {/* ✅ ABSOLUTE => vult ALTIJD het frame, geen grijze randen mogelijk */}
                          <img
                            src={src}
                            alt={`Slide ${i + 1}`}
                            draggable={false}
                            className="absolute inset-0 w-full h-full !object-cover !block"
                          />
                        </button>
                      ))}
                    </div>

                    {/* ✅ pijlen: GEEN achtergrond, pijl wit met lage opacity (forced met !) */}
                    <button
                      type="button"
                      onClick={prev}
                      aria-label="Vorige foto"
                      className="
                        absolute left-3 top-1/2 -translate-y-1/2
                        h-14 w-14
                        grid place-items-center
                        !bg-transparent
                        !shadow-none
                        !border-0
                        !ring-0
                        !outline-none
                        !text-white
                        !opacity-40 hover:!opacity-70
                        transition
                        text-5xl
                        active:scale-95
                      "
                    >
                      &#10094;
                    </button>

                    <button
                      type="button"
                onClick={next}
                aria-label="Volgende foto"
                className="
                  absolute right-3 top-1/2 -translate-y-1/2
                  h-14 w-14
                  grid place-items-center
                  !bg-transparent
                  !shadow-none
                  !border-0
                  !ring-0
                  !outline-none
                  !text-white
                  !opacity-40 hover:!opacity-70
                  transition
                  text-5xl
                  active:scale-95
                "
              >
                &#10095;
              </button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-600">
              Geen foto’s gevonden
            </div>
          )}
        </div>
      </div>

      {/* ✅ thumbs: WEL border, geen “achterkant”, image forced cover */}
      {hasImages && (
        <>
          <div className="mt-4 w-full flex justify-center">
            <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
              {images.map((src, i) => {
                const selected = i === slide
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSlide(i)}
                    aria-label={`Foto ${i + 1}`}
                    aria-current={selected ? "true" : "false"}
                    className={[
                      "relative flex-shrink-0 rounded-xl overflow-hidden border-2 transition",
                      selected ? "!border-[#1C448E]" : "!border-gray-200 hover:!border-[#1C448E]/40",
                      "!bg-transparent !p-0 !m-0 !shadow-none !ring-0 !outline-none", // ✅ geen witte/grijze achterkant
                    ].join(" ")}
                  >
                    <img
                      src={src}
                      alt={`Thumb ${i + 1}`}
                      draggable={false}
                      className="block h-16 w-24 sm:w-28 object-cover"
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-2 text-center text-xs text-gray-500">
            Foto <span className="font-semibold text-gray-800">{slide + 1}</span> van{" "}
            <span className="font-semibold text-gray-800">{images.length}</span>
          </div>
        </>
      )}
    </>
  )}
</div>

      {/* ✅ BLOK 1 + BLOK 2 */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold !text-[#1C448E]">Omschrijving</h2>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("opties")}
                className={[
                  "px-4 py-2 rounded-lg text-sm font-semibold border transition",
                  activeTab === "opties"
                    ? "bg-[#1C448E] text-white border-[#1C448E]"
                    : "bg-white text-[#1C448E] border-[#1C448E]/30 hover:border-[#1C448E]",
                ].join(" ")}
              >
                Opties
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("kenmerken")}
                className={[
                  "px-4 py-2 rounded-lg text-sm font-semibold border transition",
                  activeTab === "kenmerken"
                    ? "bg-[#1C448E] text-white border-[#1C448E]"
                    : "bg-white text-[#1C448E] border-[#1C448E]/30 hover:border-[#1C448E]",
                ].join(" ")}
              >
                Kenmerken
              </button>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-gray-700 whitespace-pre-line">{car.description ?? "—"}</p>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 overflow-hidden">
            {activeTab === "kenmerken" ? (
              <>
                <h3 className="text-lg font-semibold !text-[#1C448E] mb-4">Kenmerken</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
                  {overviewItems.map((it) => (
                    <div key={it.label} className="flex items-center justify-between gap-4 border-b border-gray-100 py-2 min-w-0">
                      <span className="text-sm font-medium text-gray-600 truncate">{it.label}</span>
                      <span className="text-sm text-gray-900 truncate">{it.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold !text-[#1C448E] mb-4">Opties</h3>

                {!optionsGroups ? (
                  <div className="text-sm text-gray-600">—</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                    {optionsGroups.map((g) => (
                      <div key={g.title} className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 mb-2">{g.title}</div>
                        <ul className="space-y-2">
                          {g.items.map((x) => (
                            <li key={x} className="text-sm text-gray-700 flex items-start gap-2 min-w-0">
                              <span className="mt-[2px] inline-block h-2 w-2 rounded-full bg-[#1C448E] flex-shrink-0" />
                              <span className="break-words">{x}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="h-fit">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-col gap-3">
              <button type="button" className="w-full rounded-xl bg-[#1C448E] text-white font-semibold py-3 hover:opacity-95">
                Proefrit aanvragen
              </button>

              <button
                type="button"
                className="w-full rounded-xl bg-white text-[#1C448E] font-semibold py-3 border border-[#1C448E]/40 hover:border-[#1C448E]"
              >
                Contact opnemen
              </button>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold !text-[#1C448E]">Prijs calculator</h3>
          <div className="text-xs text-gray-500">Tijdelijke placeholder</div>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
          Hier komt later je calculator (lease / financiering / maandbedrag).
        </div>
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold !text-[#1C448E]">Vergelijkbare auto’s</h3>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollSimilar("left")}
              className="h-10 w-10 rounded-full bg-[#1C448E] text-white text-2xl grid place-items-center shadow-sm hover:opacity-95 active:scale-95"
              aria-label="Scroll links"
            >
              &#10094;
            </button>
            <button
              type="button"
              onClick={() => scrollSimilar("right")}
              className="h-10 w-10 rounded-full bg-[#1C448E] text-white text-2xl grid place-items-center shadow-sm hover:opacity-95 active:scale-95"
              aria-label="Scroll rechts"
            >
              &#10095;
            </button>
          </div>
        </div>

        <div className="mt-5">
          <style>{`
            .hide-scrollbar::-webkit-scrollbar{ display:none; }
          `}</style>

          <div ref={simWrapRef} className="hide-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-2" style={{ scrollbarWidth: "none" }}>
            {similar.map((d) => (
              <div key={d.id} className="flex-shrink-0 w-[280px] sm:w-[320px]">
                <CarCard car={d.car} layout="grid" imageFolder={d.imageFolder || FALLBACK_IMAGE_FOLDER} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Lightbox
        images={images}
        index={slide}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrev={prev}
        onNext={next}
        onSelect={(i) => setSlide(i)}
      />
    </div>
  )
}
