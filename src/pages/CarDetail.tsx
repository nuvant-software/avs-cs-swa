import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import CarCard from "../components/CarCard"
import { Lightbox } from "../components/Lightbox"

type CarOverview = {
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
  // extra velden ok
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

// Helpers (zelfde stijl als Collection)
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

// Stabiele key (kopie uit jouw Collection)
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

const carkmToNum = (km: number) => km

const mapCarToGridData = (car: CarOverview): GridCardData => {
  const id = buildStableId(car)
  const card: GridCar = {
    id,
    brand: car.brand,
    model: car.model,
    variant: car.variant,
    fuel: car.fuel || "Onbekend",
    mileage: typeof car.km === "number" ? carkmToNum(car.km) : 0,
    transmission: car.transmission || "Onbekend",
    price: car.price,
    year: car.year ?? 0,
    engine_size: car.engine_size || "",
    pk: typeof car.pk === "number" ? car.pk : 0,
  }
  const folder = car.imageFolder && car.imageFolder.trim().length ? car.imageFolder.trim() : FALLBACK_IMAGE_FOLDER
  return { id, car: card, imageFolder: folder, raw: car }
}

// Azure blob list (zelfde als CarCard)
const blobCache = new Map<string, string[]>()

const listBlobImages = async (folder: string): Promise<string[]> => {
  const cached = blobCache.get(folder)
  if (cached) return cached

  const url = `https://avsapisa.blob.core.windows.net/carimages?restype=container&comp=list&prefix=${encodeURIComponent(
    folder + "/"
  )}`

  const res = await fetch(url)
  if (!res.ok) {
    blobCache.set(folder, [])
    return []
  }

  const xmlText = await res.text()
  const doc = new DOMParser().parseFromString(xmlText, "application/xml")
  const blobs = Array.from(doc.getElementsByTagName("Blob"))
  const urls = blobs
    .map((b) => b.getElementsByTagName("Name")[0]?.textContent)
    .filter((n): n is string => !!n && /\.(jpg|jpeg|png|webp)$/i.test(n))
    .map((name) => `https://avsapisa.blob.core.windows.net/carimages/${name}`)

  blobCache.set(folder, urls)
  return urls
}

export default function CarDetail() {
  const { id: routeId } = useParams<{ id: string }>()
  const [cars, setCars] = useState<CarOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [images, setImages] = useState<string[]>([])
  const [slide, setSlide] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const [activeTab, setActiveTab] = useState<"kenmerken" | "opties">("kenmerken")

  // 1) laad cars van Azure (zelfde endpoint als Collection)
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
        const valid: CarOverview[] = items
          .map((item) => {
            if (item && typeof item === "object") {
              const record = item as Record<string, unknown>
              const nested = (record as any).car_overview ?? (record as any).carOverview
              if (nested && typeof nested === "object") return nested as Record<string, unknown>
              return record
            }
            return null
          })
          .filter((record): record is Record<string, unknown> => !!record)
          .map((record) => {
            const id = pickString(record, ["id", "_id", "car_id", "carId", "slug", "vin"])
            const brand = pickString(record, ["brand"]) ?? ""
            const model = pickString(record, ["model"]) ?? ""
            const variant = pickString(record, ["variant"]) ?? ""
            const price = pickNumber(record, ["price"]) ?? 0
            const km = pickNumber(record, ["km", "mileage", "kilometers"])
            const pk = pickNumber(record, ["pk", "horsepower"])
            const body = pickString(record, ["body", "body_type", "carrosserie"])
            const transmission = pickString(record, ["transmission", "gearbox", "transmissie"])
            const doors = pickNumber(record, ["doors", "aantal_deuren"])
            const fuel = pickString(record, ["fuel", "brandstof"])
            const year = pickNumber(record, ["year", "bouwjaar"])
            const engineSize = pickString(record, ["engine_size", "motorinhoud"])
            const imageFolder = pickString(record, ["imageFolder", "image_folder", "folder", "imagefolder"])
            const description = pickString(record, ["description", "beschrijving", "omschrijving"])

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
              description: description ?? undefined,
            }
          })
          .filter((c) => c.brand && c.model && c.variant && typeof c.price === "number")

        setCars(valid)
      })
      .catch((err) => setError(err?.message || "Onbekende fout"))
      .finally(() => setLoading(false))
  }, [])

  // 2) vind de juiste auto op basis van routeId
  const car = useMemo(() => {
    if (!routeId) return null
    const rid = String(routeId).trim()

    // Probeer matchen op raw id/sourceId
    const direct = cars.find((c) => String(c.id ?? "").trim() === rid || String(c.sourceId ?? "").trim() === rid)
    if (direct) return direct

    // Probeer matchen op stable id (zelfde als in Collection)
    const stable = cars.find((c) => buildStableId(c) === rid)
    if (stable) return stable

    return null
  }, [cars, routeId])

  const gridData = useMemo(() => {
    if (!car) return null
    return mapCarToGridData(car)
  }, [car])

  // 3) laad images op basis van imageFolder
  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!car) return
      const folder = (car.imageFolder && car.imageFolder.trim().length ? car.imageFolder.trim() : FALLBACK_IMAGE_FOLDER) as string
      const urls = await listBlobImages(folder)
      if (cancelled) return
      setImages(urls)
      setSlide(0)
    }

    setImages([])
    setSlide(0)
    run()

    return () => {
      cancelled = true
    }
  }, [car])

  const hasImages = images.length > 0
  const currentImg = hasImages ? images[Math.min(slide, images.length - 1)] : ""

  const prev = () => {
    if (!hasImages) return
    setSlide((s) => (s - 1 + images.length) % images.length)
  }
  const next = () => {
    if (!hasImages) return
    setSlide((s) => (s + 1) % images.length)
  }

  // vergelijkbare auto's (simpel: zelfde brand of body, anders nieuwste)
  const similar = useMemo(() => {
    if (!car) return []
    const list = cars.filter((c) => c !== car)

    const primary = list.filter((c) => {
      const sameBrand = (c.brand || "").toLowerCase() === (car.brand || "").toLowerCase()
      const sameBody =
        car.body && c.body ? String(c.body).toLowerCase() === String(car.body).toLowerCase() : false
      return sameBrand || sameBody
    })

    const sortNewFirst = (a: CarOverview, b: CarOverview) => (b.year ?? 0) - (a.year ?? 0)

    const chosen = (primary.length ? primary : list).slice().sort(sortNewFirst).slice(0, 4)
    return chosen.map(mapCarToGridData)
  }, [cars, car])

  if (loading) return <div className="max-w-screen-2xl mx-auto px-4 py-10">Laden...</div>

  if (error) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-10">
        <Link to="/collection" className="underline opacity-80">
          ← Terug naar collectie
        </Link>
        <div className="mt-6 text-red-600 text-sm">{error}</div>
      </div>
    )
  }

  if (!car || !gridData) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-10">
        <Link to="/collection" className="underline opacity-80">
          ← Terug naar collectie
        </Link>
        <div className="mt-6">Auto niet gevonden.</div>
      </div>
    )
  }

  // top klein
  const topSmall = `Merk: ${car.brand}  •  Model: ${car.model}  •  Body: ${car.body ?? "—"}`
  const title = `${car.brand} ${car.model} ${car.year ?? ""}`.trim()

  // omschrijving: uit API (record.description/beschrijving/omschrijving)
  const descriptionText = (car.description && String(car.description).trim()) || "—"

  // overview items exact lijst
  const overviewItems: Array<{ label: string; value: string }> = [
    { label: "Conditie", value: car.condition ?? "—" },
    { label: "Nummer", value: car.number ?? car.stockNumber ?? "—" },
    { label: "VIN", value: car.vin ?? "—" },
    { label: "Jaar", value: String(car.year ?? "—") },
    { label: "Kilometerstand", value: `${(car.km ?? 0).toLocaleString("nl-NL")} km` },
    { label: "Transmissie", value: car.transmission ?? "—" },
    { label: "Motorinhoud", value: car.engine_size ?? "—" },
    { label: "Aandrijving", value: car.driver_type ?? car.drive ?? "—" },
    { label: "Kleur", value: car.color ?? "—" },
    { label: "Brandstof", value: car.fuel ?? "—" },
  ]

  // features: als jouw API dit niet levert, blijft het leeg (geen “extra”)
  // Verwacht: car.features = { Safety: [...], Interior: [...] } of car.options etc.
  const features: Record<string, string[]> | null =
    (car.features && typeof car.features === "object" ? (car.features as Record<string, string[]>) : null) ||
    (car.options && typeof car.options === "object" ? (car.options as Record<string, string[]>) : null) ||
    null

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <Link to="/collection" className="inline-flex items-center gap-2 text-sm underline opacity-80">
        ← Terug
      </Link>

      <div className="mt-4 text-sm opacity-70">{topSmall}</div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-semibold !text-[#1C448E]">{title}</h1>

        <div className="text-right">
          <div className="text-xs opacity-60 mb-1">Prijs</div>
          <div className="text-2xl md:text-3xl font-semibold !text-[#1C448E]">
            € {car.price.toLocaleString("nl-NL")}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* LEFT */}
        <div>
          {/* Grote foto + pijlen */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
            <div className="relative w-full h-[260px] sm:h-[420px] bg-gray-100">
              {hasImages ? (
                <img
                  src={currentImg}
                  alt={`${car.brand} ${car.model}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightboxOpen(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                  Geen foto’s gevonden
                </div>
              )}

              <button
                type="button"
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 border border-gray-200 grid place-items-center hover:bg-white"
                aria-label="Vorige foto"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 border border-gray-200 grid place-items-center hover:bg-white"
                aria-label="Volgende foto"
              >
                ›
              </button>
            </div>

            {/* Thumbs */}
            <div className="p-3 border-t border-gray-200">
              <div className="flex gap-2 overflow-x-auto">
                {images.slice(0, 12).map((src, idx) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSlide(idx)}
                    className={[
                      "h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border",
                      idx === slide ? "border-[#1C448E]" : "border-gray-200",
                    ].join(" ")}
                    aria-label={`Foto ${idx + 1}`}
                  >
                    <img src={src} alt={`thumb ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Omschrijving (blijft boven tabs) */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold !text-[#1C448E]">Omschrijving</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 whitespace-pre-line">{descriptionText}</p>
          </div>

          {/* Tabs */}
          <div className="mt-8">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("kenmerken")}
                className={[
                  "px-4 py-2 rounded-lg text-sm font-semibold border",
                  activeTab === "kenmerken"
                    ? "bg-[#1C448E] text-white border-[#1C448E]"
                    : "bg-white text-[#1C448E] border-[#1C448E]/30 hover:border-[#1C448E]",
                ].join(" ")}
              >
                Kenmerken
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("opties")}
                className={[
                  "px-4 py-2 rounded-lg text-sm font-semibold border",
                  activeTab === "opties"
                    ? "bg-[#1C448E] text-white border-[#1C448E]"
                    : "bg-white text-[#1C448E] border-[#1C448E]/30 hover:border-[#1C448E]",
                ].join(" ")}
              >
                Opties
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
              {activeTab === "kenmerken" ? (
                <>
                  <h3 className="text-lg font-semibold !text-[#1C448E] mb-4">Car overview</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
                    {overviewItems.map((it) => (
                      <div
                        key={it.label}
                        className="flex items-center justify-between gap-4 border-b border-gray-100 py-2"
                      >
                        <span className="text-sm font-medium text-gray-600">{it.label}</span>
                        <span className="text-sm text-gray-900">{it.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold !text-[#1C448E] mb-4">Features</h3>

                  {!features ? (
                    <div className="text-sm text-gray-600">—</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(features).map(([category, items]) => (
                        <div key={category}>
                          <div className="text-sm font-semibold text-gray-900 mb-2">{category}</div>
                          <ul className="space-y-2">
                            {items.map((x) => (
                              <li key={x} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="mt-[2px] inline-block h-2 w-2 rounded-full bg-[#1C448E]" />
                                <span>{x}</span>
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

          {/* Lease calculator (tijdelijk) */}
          <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-lg font-semibold !text-[#1C448E]">Lease calculator</h3>
            <p className="mt-2 text-sm text-gray-600">Tijdelijke placeholder.</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="text-xs opacity-60">Looptijd</div>
                <div className="mt-1 text-sm font-semibold">36 maanden</div>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="text-xs opacity-60">Aanbetaling</div>
                <div className="mt-1 text-sm font-semibold">€ 0</div>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="text-xs opacity-60">Indicatie</div>
                <div className="mt-1 text-sm font-semibold">— / maand</div>
              </div>
            </div>
          </div>

          {/* Vergelijkbare auto's */}
          <div className="mt-10">
            <h3 className="text-xl font-semibold !text-[#1C448E]">Vergelijkbare auto’s</h3>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {similar.map((d) => (
                <CarCard
                  key={d.id}
                  car={d.car}
                  layout="grid"
                  imageFolder={d.imageFolder || FALLBACK_IMAGE_FOLDER}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-col gap-3">
              <button
                type="button"
                className="w-full rounded-xl bg-[#1C448E] text-white font-semibold py-3 hover:opacity-95"
              >
                Contact opnemen
              </button>

              <button
                type="button"
                className="w-full rounded-xl bg-white text-[#1C448E] font-semibold py-3 border border-[#1C448E]/40 hover:border-[#1C448E]"
              >
                Proefrit aanvragen
              </button>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-gray-900 mb-3">Bericht</div>
              <input className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Naam" />
              <input className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mt-2" placeholder="E-mail" />
              <input className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mt-2" placeholder="Telefoon" />
              <textarea
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mt-2 min-h-[120px]"
                placeholder="Je bericht..."
              />
              <button
                type="button"
                className="mt-3 w-full rounded-xl bg-[#1C448E] text-white font-semibold py-3 hover:opacity-95"
              >
                Verzenden
              </button>
            </div>
          </div>
        </aside>
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
