  import { useEffect, useMemo, useState } from "react"
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

  const getRegYear = (reg?: string): number | undefined => {
    // verwacht "14-07-2018"
    const m = String(reg ?? "").match(/(\d{4})$/)
    return m ? Number(m[1]) : undefined
  }

  // ----------------- helpers -----------------
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

  // Stable id (zelfde idee als Collection)
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

    const folder =
      car.imageFolder && car.imageFolder.trim().length ? car.imageFolder.trim() : FALLBACK_IMAGE_FOLDER

    return { id, car: card, imageFolder: folder, raw: car }
  }

  // pictures "./images/autos/005/" -> "car_005"
  const picturesToFolder = (pictures?: string): string | undefined => {
    if (!pictures) return undefined
    const m = pictures.match(/\/(\d{3})\/?$/)
    if (!m) return undefined
    return `car_${m[1]}`
  }

  // ----------------- Azure blob list (zelfde als CarCard) -----------------
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

  const preloadImage = (src: string) =>
    new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject()
      img.src = src
    })

  // ----------------- UI: skeleton -----------------
  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded-2xl bg-gray-100 ${className}`} />
  )

  // ----------------- robust route matching -----------------
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

    // “geen lelijke flash”: pas true als data + hero image klaar
    const [pageReady, setPageReady] = useState(false)

    const [activeTab, setActiveTab] = useState<"kenmerken" | "opties">("kenmerken")

    // 1) laad cars via dezelfde API als Collection
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

              // we willen: overview velden + root arrays (features)
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

    // 2) vind car (robust)
    // 2) vind car (robust)
    const car = useMemo(() => {
      if (!routeId) return null

      const ridRaw = String(routeId).trim()
      const rid = normId(ridRaw)

      // A) direct id/sourceId
      const direct = cars.find((c) => normId(c.id) === rid || normId(c.sourceId) === rid)
      if (direct) return direct

      // B) stableId exact
      const stableExact = cars.find((c) => normId(buildStableId(c)) === rid)
      if (stableExact) return stableExact

      // C) tolerant match voor jouw url: brand|model|variant|year|trans|engine|fuel
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

          // year mag uit car.year of uit registration komen
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

        // drempel: brand+model+variant (=9) is al genoeg
        if (best && bestScore >= 8) return best
      }

      // D) vin / stock fallback
      const byVin = cars.find((c) => normId(c.vin_number ?? c.id) === rid)
      if (byVin) return byVin

      const byStock = cars.find((c) => normId(c.stock_number) === rid)
      if (byStock) return byStock

      return null
    }, [cars, routeId])


    // 3) images laden + preload eerste image (om flits te vermijden)
    useEffect(() => {
      let cancelled = false

      async function run() {
        setPageReady(false)

        if (!car) return

        const folder =
          car.imageFolder && car.imageFolder.trim().length ? car.imageFolder.trim() : FALLBACK_IMAGE_FOLDER

        const urls = await listBlobImages(folder)
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
    const currentImg = hasImages ? images[Math.min(slide, images.length - 1)] : ""

    const prev = () => {
      if (!hasImages) return
      setSlide((s) => (s - 1 + images.length) % images.length)
    }
    const next = () => {
      if (!hasImages) return
      setSlide((s) => (s + 1) % images.length)
    }

    // opties uit jouw velden
    const optionsGroups = useMemo(() => {
      if (!car) return null

      const groups: Array<{ title: string; items: string[] }> = []
      if (car.safety_features?.length) groups.push({ title: "Safety", items: car.safety_features })
      if (car.exterior_features?.length) groups.push({ title: "Exterior", items: car.exterior_features })
      if (car.interior_features?.length) groups.push({ title: "Interior", items: car.interior_features })
      if (car.convenience_features?.length) groups.push({ title: "Convenience", items: car.convenience_features })

      return groups.length ? groups : null
    }, [car])

    // vergelijkbare auto's als reel
    const similar = useMemo(() => {
      if (!car) return []
      const list = cars.filter((c) => c !== car)

      const primary = list.filter((c) => {
        const sameBrand = (c.brand || "").toLowerCase() === (car.brand || "").toLowerCase()
        const sameBody = car.body && c.body ? String(c.body).toLowerCase() === String(car.body).toLowerCase() : false
        return sameBrand || sameBody
      })

      const sortNewFirst = (a: CarOverview, b: CarOverview) => (b.year ?? 0) - (a.year ?? 0)

      return (primary.length ? primary : list).slice().sort(sortNewFirst).slice(0, 8).map(mapCarToGridData)
    }, [cars, car])

    // ----------------- skeleton state (geen “Laden…”) -----------------
    if (loading) {
      return (
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
          <Skeleton className="h-5 w-24" />
          <div className="mt-4">
            <Skeleton className="h-4 w-72" />
            <div className="mt-3 flex items-start justify-between gap-4">
              <Skeleton className="h-10 w-[60%]" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>

          {/* full-width foto skeleton */}
          <div className="mt-8 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 md:px-6 lg:px-8">
            <Skeleton className="h-[340px] sm:h-[620px] w-full" />
            <div className="mt-4 flex gap-4 overflow-hidden">
              <Skeleton className="h-28 w-52" />
              <Skeleton className="h-28 w-52" />
              <Skeleton className="h-28 w-52" />
              <Skeleton className="h-28 w-52" />
            </div>
          </div>

          {/* onderstuk skeleton */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            <div>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-20 w-full mt-3" />
              <Skeleton className="h-56 w-full mt-6" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
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

    const topSmall = `Merk: ${car.brand}  •  Model: ${car.model}  •  Body: ${car.body ?? "—"}`
    const title = `${car.brand} ${car.model} ${car.year ?? ""}`.trim()

    const overviewItems: Array<{ label: string; value: string }> = [
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
    ]

    return (
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* BOVENSTUK */}
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

        {/* FOTO (full width) */}
        <div className="mt-8 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 md:px-6 lg:px-8">
          {!pageReady ? (
            <>
              <Skeleton className="h-[340px] sm:h-[620px] w-full" />
              <div className="mt-4 flex gap-4 overflow-hidden">
                <Skeleton className="h-28 w-52" />
                <Skeleton className="h-28 w-52" />
                <Skeleton className="h-28 w-52" />
                <Skeleton className="h-28 w-52" />
              </div>
            </>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
              <div className="relative w-full h-[340px] sm:h-[620px] bg-gray-100">
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
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/90 border border-gray-200 grid place-items-center hover:bg-white"
                  aria-label="Vorige foto"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={next}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/90 border border-gray-200 grid place-items-center hover:bg-white"
                  aria-label="Volgende foto"
                >
                  ›
                </button>
              </div>

              {/* thumbs groter & zichtbaar */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-4 overflow-x-auto pb-1">
                  {images.map((src, idx) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setSlide(idx)}
                      className={[
                        "h-28 w-52 flex-shrink-0 overflow-hidden rounded-xl border",
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
          )}
        </div>

        {/* ONDERSTUK */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* links */}
          <div>
            <h2 className="text-xl font-semibold !text-[#1C448E]">Omschrijving</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
              {car.description ?? "—"}
            </p>

            {/* Tabs (Kenmerken/Opties) */}
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

                    {!optionsGroups ? (
                      <div className="text-sm text-gray-600">—</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {optionsGroups.map((g) => (
                          <div key={g.title}>
                            <div className="text-sm font-semibold text-gray-900 mb-2">{g.title}</div>
                            <ul className="space-y-2">
                              {g.items.map((x) => (
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

            {/* Lease calculator placeholder */}
            <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="text-lg font-semibold !text-[#1C448E]">Lease calculator</h3>
              <p className="mt-2 text-sm text-gray-600">Tijdelijke placeholder.</p>
            </div>

            {/* Featured cars als reel */}
            <div className="mt-10">
              <h3 className="text-xl font-semibold !text-[#1C448E]">Vergelijkbare auto’s</h3>

              <div className="mt-4 flex gap-6 overflow-x-auto pb-2">
                {similar.map((d) => (
                  <div key={d.id} className="flex-shrink-0 w-[320px]">
                    <CarCard car={d.car} layout="grid" imageFolder={d.imageFolder || FALLBACK_IMAGE_FOLDER} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* rechts (in ONDERSTUK, dus niet naast foto) */}
          <aside className="h-fit">
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
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mt-2"
                  placeholder="E-mail"
                />
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mt-2"
                  placeholder="Telefoon"
                />
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
