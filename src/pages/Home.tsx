// src/pages/Home.tsx
import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import FilterRangeSlider from '../components/filters/FilterRangeSlider'
import MultiSearchSelect from '../components/filters/MultiSearchSelect'

interface CarOverview {
  brand: string
  model: string
  variant: string
  price: number
}

const Home: React.FC = () => {
  const navigate = useNavigate()

  // 1️⃣ Raw data + status
  const [cars, setCars]       = useState<CarOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string|null>(null)

  // 2️⃣ Geselecteerde filters
  const [brandSelected, setBrandSelected]     = useState<string[]>([])
  const [modelSelected, setModelSelected]     = useState<string[]>([])
  const [variantSelected, setVariantSelected] = useState<string[]>([])
  const [priceRange, setPriceRange]           = useState<[number,number]>([0,0])

  // bij mount: alles ophalen + validatie
  useEffect(() => {
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
          .map(item => item.car_overview)
          .filter(co =>
            co &&
            typeof co.brand   === 'string' &&
            typeof co.model   === 'string' &&
            typeof co.variant === 'string' &&
            typeof co.price   === 'number'
          )
          .map(co => ({
            brand:   co.brand,
            model:   co.model,
            variant: co.variant,
            price:   co.price
          }))

        setCars(valid)

        // init prijs-slider (nóg geen relatie met andere filters!)
        if (valid.length) {
          const prices = valid.map(c => c.price)
          setPriceRange([Math.min(...prices), Math.max(...prices)])
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // 3️⃣ Facetten & instant filtering
  const brands = useMemo(
    () => Array.from(new Set(cars.map(c => c.brand))).sort(),
    [cars]
  )

  const models = useMemo(() => {
    const base = brandSelected.length
      ? cars.filter(c => brandSelected.includes(c.brand))
      : cars
    return Array.from(new Set(base.map(c => c.model))).sort()
  }, [cars, brandSelected])

  const variants = useMemo(() => {
    const base = modelSelected.length
      ? cars.filter(c =>
          (brandSelected.length === 0 || brandSelected.includes(c.brand)) &&
          modelSelected.includes(c.model)
        )
      : (brandSelected.length
          ? cars.filter(c => brandSelected.includes(c.brand))
          : cars
        )
    return Array.from(new Set(base.map(c => c.variant))).sort()
  }, [cars, brandSelected, modelSelected])

  // 4️⃣ Auto-deselect: houd enkel wat nog geldig is
  useEffect(() => {
    setModelSelected(ms => ms.filter(m => models.includes(m)))
  }, [models])
  useEffect(() => {
    setVariantSelected(vs => vs.filter(v => variants.includes(v)))
  }, [variants])

  // 5️⃣ Gefilterde lijst & count
  const filteredCars = useMemo(
    () =>
      cars.filter(c =>
        (!brandSelected.length   || brandSelected.includes(c.brand))   &&
        (!modelSelected.length   || modelSelected.includes(c.model))   &&
        (!variantSelected.length || variantSelected.includes(c.variant))&&
        c.price >= priceRange[0] && c.price <= priceRange[1]
      ),
    [cars, brandSelected, modelSelected, variantSelected, priceRange]
  )

  // 6️⃣ Zoek → Collection
  const onSearch = () => {
    navigate('/collection', {
      state: {
        filters: {
          brand:     brandSelected,
          model:     modelSelected,
          variant:   variantSelected,
          price_min: priceRange[0],
          price_max: priceRange[1]
        },
        includeItems: true
      }
    })
  }

  if (loading) return <p className="p-4">Bezig met laden…</p>
  if (error)   return <p className="p-4 text-red-500">Fout: {error}</p>

  return (
    <>
      {/* HERO (onveranderd) */}
      <section className="
          relative w-screen h-[85vh] md:h-[80vh]
          !bg-[url('/assets/hero/slide1.jpg')] !bg-cover !bg-center
          flex items-center justify-start pb-10
        ">
        <div className="absolute inset-0 !bg-black/60" />
        <div className="relative w-3/4 mx-auto px-6 text-left text-white">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 mt-24">
            Welkom bij AVS Autoverkoop
          </h1>
          <p className="text-lg md:text-2xl mb-6">
            Kwaliteit en betrouwbaarheid sinds 2004
          </p>
          <button className="!bg-[#27408B] text-white px-6 py-3 rounded-lg hover:!bg-[#0A1833] transition">
            Bekijk Onze Auto's
          </button>
        </div>
      </section>

      {/* FILTERBAR */}
      <div className="relative w-screen">
        {/* MOBILE */}
        <div className="md:hidden flex flex-col space-y-4 px-6 mt-8 mb-8">
          <h3 className="text-xl font-semibold">Auto zoeken</h3>
          <MultiSearchSelect label="Merk"    options={brands}   selected={brandSelected}   onChange={setBrandSelected}/>
          <MultiSearchSelect label="Model"   options={models}   selected={modelSelected}   onChange={setModelSelected}/>
          <MultiSearchSelect label="Variant" options={variants} selected={variantSelected} onChange={setVariantSelected}/>
          <FilterRangeSlider
            label="Prijs"
            min={priceRange[0]}
            max={priceRange[1]}
            value={priceRange}
            onChange={setPriceRange}
            placeholderMin={priceRange[0].toString()}
            placeholderMax={priceRange[1].toString()}
          />
          <button
            onClick={onSearch}
            className="w-full py-3 bg-[#27408B] text-white rounded-md hover:bg-[#0A1833] transition"
          >
            Zoek ({filteredCars.length}) Auto’s
          </button>
        </div>

        {/* TABLET */}
        <div className="hidden md:flex lg:hidden flex-col space-y-4 mx-auto w-3/4 px-6 py-6 bg-white shadow-lg rounded-lg -mt-20 z-20">
          <div className="flex gap-6">
            <MultiSearchSelect label="Merk"    options={brands}   selected={brandSelected}   onChange={setBrandSelected}/>
            <MultiSearchSelect label="Model"   options={models}   selected={modelSelected}   onChange={setModelSelected}/>
            <MultiSearchSelect label="Variant" options={variants} selected={variantSelected} onChange={setVariantSelected}/>
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <FilterRangeSlider
                label="Prijs"
                min={priceRange[0]}
                max={priceRange[1]}
                value={priceRange}
                onChange={setPriceRange}
                placeholderMin={priceRange[0].toString()}
                placeholderMax={priceRange[1].toString()}
              />
            </div>
            <div className="flex-1">
              <button
                onClick={onSearch}
                className="w-full h-14 bg-[#27408B] text-white rounded-md hover:bg-[#0A1833] transition"
              >
                Zoek ({filteredCars.length}) Auto’s
              </button>
            </div>
          </div>
        </div>

        {/* DESKTOP (onveranderd) */}
        <div className="hidden lg:flex items-center justify-between gap-x-6 mx-auto w-3/4 px-6 py-6 bg-white shadow-lg -mt-20 z-20">
          <div className="w-60"><MultiSearchSelect label="Merk"    options={brands}   selected={brandSelected}   onChange={setBrandSelected}/></div>
          <div className="w-60"><MultiSearchSelect label="Model"   options={models}   selected={modelSelected}   onChange={setModelSelected}/></div>
          <div className="w-60"><MultiSearchSelect label="Variant" options={variants} selected={variantSelected} onChange={setVariantSelected}/></div>
          <div className="w-80">
            <FilterRangeSlider
              label="Prijs"
              min={priceRange[0]}
              max={priceRange[1]}
              value={priceRange}
              onChange={setPriceRange}
              placeholderMin={priceRange[0].toString()}
              placeholderMax={priceRange[1].toString()}
            />
          </div>
          <button
            onClick={onSearch}
            className="w-72 h-14 bg-[#27408B] text-white rounded-md hover:bg-[#0A1833] transition"
          >
            Zoek ({filteredCars.length}) Auto’s
          </button>
        </div>
      </div>

      {/* OVER ONS */}
      <section className="bg-gray-50 py-16">
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
