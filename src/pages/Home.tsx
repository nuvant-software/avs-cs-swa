import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Loader from '../components/Loader'
import FilterRangeSlider from '../components/filters/FilterRangeSlider'
import MultiSearchSelect from '../components/filters/MultiSearchSelect'


const Home: React.FC = () => {
  const navigate = useNavigate()

  // ── 1️⃣ Raw data + status ──────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string|null>(null)

  // ── 2️⃣ Geselecteerde filters ─────────────────────────────
  const [brandSelected, setBrandSelected]     = useState<string[]>([])
  // Model:   "Brand — Model"
  // Variant: "Brand — Model — Variant"
  const [modelSelected, setModelSelected]     = useState<string[]>([])
  const [variantSelected, setVariantSelected] = useState<string[]>([])

  // ── 3️⃣ Prijs-slider bounds + range ────────────────────────
  const [priceBounds, setPriceBounds] = useState<[number,number]>([0,0])
  const [priceRange, setPriceRange]   = useState<[number,number]>([0,0])


  // 👉 Helper: bouw backend-vriendelijke filters (gescope’d)
  function buildApiFilters() {
    const models_by_brand: Record<string, string[]> = {}
    modelSelected.forEach(t => {
      const [brand, model] = t.split(' — ')
      if (!brand || !model) return
      ;(models_by_brand[brand] ||= []).push(model)
    })

    const variants_by_brand_model: Record<string, Record<string, string[]>> = {}
    variantSelected.forEach(t => {
      const [brand, model, variant] = t.split(' — ')
      if (!brand || !model || !variant) return
      ;(variants_by_brand_model[brand] ||= {})
      ;(variants_by_brand_model[brand][model] ||= []).push(variant)
    })

    return {
      brands: brandSelected,
      models_by_brand,
      variants_by_brand_model,
      price_min: priceRange[0],
      price_max: priceRange[1],
    }
  }

  // ── bij mount: haal alleen metadata op (geen items) ─────────
  useEffect(() => {
    fetch('/api/filter_cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters: {}, includeItems: false })
    })
      .then(res => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data:{ facets?: any, price_range?: [number, number] }) => {
        // Haal alleen de prijs range op voor de slider
        if (data.price_range && Array.isArray(data.price_range) && data.price_range.length === 2) {
          setPriceBounds(data.price_range)
          setPriceRange(data.price_range)
        } else {
          // Fallback prijzen als er geen data is
          setPriceBounds([0, 100000])
          setPriceRange([0, 100000])
        }
        
        // Data wordt geladen in Collection pagina
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // ── Facets ────────────────────────────────────────────────
  // Voor nu hardcoded opties - deze zouden uit de API moeten komen
  const brands = useMemo(() => [
    'Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Ford', 'Opel', 'Peugeot', 'Renault'
  ], [])

  // Model-opties als "Brand — Model" - voor nu leeg
  const modelOptions = useMemo(() => [], [])

  // Variant-opties als "Brand — Model — Variant" - voor nu leeg  
  const variantOptions = useMemo(() => [], [])

  // ── Parent → child resets ─────────────────────────────────
  useEffect(() => {
    if (brandSelected.length === 0) {
      setModelSelected([])
      setVariantSelected([])
    }
  }, [brandSelected])

  useEffect(() => {
    if (modelSelected.length === 0) {
      setVariantSelected([])
    }
  }, [modelSelected])

  // Houd geselecteerde model/variant in sync met beschikbare opties
  // Voor nu uitgeschakeld omdat we geen dynamische opties hebben

  // ── Per-merk scoping m.b.v. token-maps ───────────────────
  // Deze worden gebruikt in buildApiFilters maar niet meer in filtering

  // 👉 Gebruik de gescope’de payload richting collectie/backend
  const onSearch = () => {
    const apiFilters = buildApiFilters()
    navigate('/collection', {
      state: {
        filters: apiFilters,     // { brands, models_by_brand, variants_by_brand_model, price_min, price_max }
        includeItems: true
      }
    })
  }

  // ── Early returns ────────────────────────────
  if (loading) return <Loader/>
  if (error)   return <Loader />

  // ── UI ───────────────────────────────────────
  return (
    <>
      {/* HERO */}
      <section
        className={`
          relative w-screen h-[85vh] md:h-[80vh]
          !bg-[url('/assets/hero/slide1.jpg')] !bg-cover !bg-center
          flex items-center justify-start pb-10
        `}
      >
        <div className="absolute inset-0 !bg-black/60" />
        <div className="relative w-3/4 mx-auto px-6 text-left text-white">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 mt-24">
            Welkom bij AVS Autoverkoop
          </h1>
          <p className="text-lg md:text-2xl mb-6">
            Kwaliteit en betrouwbaarheid sinds 2004
          </p>
          <button
            onClick={() =>
              navigate('/collection', {
                state: { filters: {}, includeItems: true }
              })
            }
            className="!bg-[#27408B] text-white px-6 py-3 rounded-lg hover:!bg-[#0A1833] transition"
          >
            Bekijk Onze Auto’s
          </button>
        </div>
      </section>

      {/* FILTERBAR */}
      <div className="relative w-screen">
        {/* MOBILE */}
        <div className="md:hidden flex flex-col space-y-4 px-6 mt-8 mb-8">
          <h3 className="text-xl font-semibold">Auto zoeken</h3>

          <MultiSearchSelect
            label="Merk"
            options={brands}
            selected={brandSelected}
            onChange={setBrandSelected}
          />

          <MultiSearchSelect
            label="Model"
            options={modelOptions}                // "Brand — Model"
            selected={modelSelected}
            onChange={setModelSelected}
            disabled={brandSelected.length === 0}
          />

          <MultiSearchSelect
            label="Variant"
            options={variantOptions}              // "Brand — Model — Variant"
            selected={variantSelected}
            onChange={setVariantSelected}
            disabled={modelSelected.length === 0}
          />

          <FilterRangeSlider
            label="Prijs"
            min={priceBounds[0]}
            max={priceBounds[1]}
            value={priceRange}
            onChange={setPriceRange}
            placeholderMin={priceBounds[0].toString()}
            placeholderMax={priceBounds[1].toString()}
          />

          <button
            onClick={onSearch}
            className="w-full py-3 !bg-[#27408B] text-white rounded-md flex items-center justify-center hover:!bg-[#0A1833] transition"
          >
            Zoek Auto's
          </button>
        </div>

        {/* TABLET */}
        <div className="hidden md:flex lg:hidden flex-col space-y-4 mx-auto w-3/4 px-6 py-6 !bg-white shadow-lg rounded-lg -mt-20 relative z-20">
          <div className="flex gap-6">
            <MultiSearchSelect
              label="Merk"
              options={brands}
              selected={brandSelected}
              onChange={setBrandSelected}
            />
            <MultiSearchSelect
              label="Model"
              options={modelOptions}
              selected={modelSelected}
              onChange={setModelSelected}
              disabled={brandSelected.length === 0}
            />
            <MultiSearchSelect
              label="Variant"
              options={variantOptions}
              selected={variantSelected}
              onChange={setVariantSelected}
              disabled={modelSelected.length === 0}
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex-1">
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
            <div className="flex-1 flex justify-center">
              <button
                onClick={onSearch}
                className="w-full h-14 !bg-[#27408B] !text-white rounded-md flex items-center justify-center hover:!bg-[#0A1833] transition"
              >
                Zoek Auto's
              </button>
            </div>
          </div>
        </div>

        {/* DESKTOP */}
        <div className="hidden lg:flex items-center justify-between gap-x-6 mx-auto w-3/4 px-6 py-6 !bg-white shadow-lg -mt-20 relative z-20">
          <div className="w-60">
            <MultiSearchSelect
              label="Merk"
              options={brands}
              selected={brandSelected}
              onChange={setBrandSelected}
            />
          </div>
          <div className="w-60">
            <MultiSearchSelect
              label="Model"
              options={modelOptions}
              selected={modelSelected}
              onChange={setModelSelected}
              disabled={brandSelected.length === 0}
            />
          </div>
          <div className="w-60">
            <MultiSearchSelect
              label="Variant"
              options={variantOptions}
              selected={variantSelected}
              onChange={setVariantSelected}
              disabled={modelSelected.length === 0}
            />
          </div>
          <div className="w-80">
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
          <button
            onClick={onSearch}
            className="w-72 h-14 !bg-[#27408B] text-white rounded-md flex items-center justify-center hover:!bg-[#0A1833] transition"
          >
            Zoek Auto's
          </button>
        </div>
      </div>

      {/* OVER ONS */}
      <section className="!bg-gray-50 py-16">
        <div className="w-3/4 mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Over Ons</h2>
          <p className="text-lg text-gray-700">
            AVS Autoverkoop is al meer dan 20 jaar dé specialist in kwalitatieve tweedehands auto's.
          </p>
        </div>
      </section>
    </>
  )
}

export default Home
