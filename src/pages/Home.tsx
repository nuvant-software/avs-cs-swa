import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import FilterRangeSlider from '../components/filters/FilterRangeSlider'
import MultiSearchSelect from '../components/filters/MultiSearchSelect'

interface CarOverview {
  brand: string
  model: string
  variant: string
  price: number
  // … eventueel thumbnailUrl enzovoorts
}

const Home: React.FC = () => {
  const navigate = useNavigate()

  // 1) Raw data: alles in één keer laden
  const [cars, setCars]             = useState<CarOverview[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string|null>(null)

  // 2) Geselecteerde filters
  const [brandSelected, setBrandSelected]     = useState<string[]>([])
  const [modelSelected, setModelSelected]     = useState<string[]>([])
  const [variantSelected, setVariantSelected] = useState<string[]>([])
  const [priceRange, setPriceRange]           = useState<[number,number]>([0,0])

  // bij mount: haal alles op (zonder foto’s!)
  useEffect(() => {
    fetch('/api/filter_cars', {
      method: 'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ filters:{}, includeItems:true })
    })
      .then(res => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data:{ items: CarOverview[] }) => {
        setCars(data.items)
        // init price slider
        const prices = data.items.map(c => c.price)
        const mn = Math.min(...prices,0)
        const mx = Math.max(...prices,0)
        setPriceRange([mn,mx])
      })
      .catch(err => setError(err.message))
      .finally(()=> setLoading(false))
  }, [])

  // 3) Afgeleide opties met useMemo → instant
  const brands   = useMemo(() => Array.from(new Set(cars.map(c=>c.brand))).sort(), [cars])
  const models   = useMemo(() => {
    if (!brandSelected.length) return []
    return Array.from(new Set(
      cars
        .filter(c=> brandSelected.includes(c.brand))
        .map(c=>c.model)
    )).sort()
  }, [cars, brandSelected])
  const variants = useMemo(() => {
    if (!modelSelected.length) return []
    return Array.from(new Set(
      cars
        .filter(c=>
          brandSelected.includes(c.brand) &&
          modelSelected.includes(c.model)
        )
        .map(c=>c.variant)
    )).sort()
  }, [cars, brandSelected, modelSelected])

  // 4) Filterde lijst & count
  const filteredCars = useMemo(() => {
    return cars.filter(c=>
      (!brandSelected.length   || brandSelected.includes(c.brand))   &&
      (!modelSelected.length   || modelSelected.includes(c.model))   &&
      (!variantSelected.length || variantSelected.includes(c.variant))&&
      c.price >= priceRange[0] && c.price <= priceRange[1]
    )
  }, [cars, brandSelected, modelSelected, variantSelected, priceRange])

  // 5) Search → Collection
  const onSearch = () => {
    navigate('/collection', {
      state: {
        filters: {
          brand: brandSelected,
          model: modelSelected,
          variant: variantSelected,
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
      {/* HERO … onveranderd … */}

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
            options={models}
            selected={modelSelected}
            onChange={setModelSelected}
            disabled={!brandSelected.length}
          />
          <MultiSearchSelect
            label="Variant"
            options={variants}
            selected={variantSelected}
            onChange={setVariantSelected}
            disabled={!modelSelected.length}
          />

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
            className="w-full py-3 !bg-[#27408B] text-white rounded-md flex items-center justify-center space-x-2 hover:!bg-[#0A1833] transition"
          >
            <span>Zoek ({filteredCars.length}) Auto’s</span>
          </button>
        </div>

        {/* TABLET & DESKTOP – zelfde logica, anders alleen styling */}
        {/* ...OOK hier in de knop: `Zoek ({filteredCars.length}) Auto’s` … */}
      </div>

      {/* OVER ONS … */}
    </>
  )
}

export default Home
