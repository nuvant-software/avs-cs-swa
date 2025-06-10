import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FilterRangeSlider from '../components/filters/FilterRangeSlider'
import MultiSearchSelect from '../components/filters/MultiSearchSelect'

interface FacetsResponse {
  totalCount: number
  facets: {
    brands: { options: string[] }
    models: { options: string[] }
    variants: { options: string[] }
  }
  ranges: {
    price: [number, number]
  }
}

const Home: React.FC = () => {
  const navigate = useNavigate()

  // ✨ geselecteerde filters
  const [brandSelected, setBrandSelected]     = useState<string[]>([])
  const [modelSelected, setModelSelected]     = useState<string[]>([])
  const [variantSelected, setVariantSelected] = useState<string[]>([])
  const [priceRange, setPriceRange]           = useState<[number, number]>([0, 0])

  // ✨ dropdown-opties
  const [brands, setBrands]     = useState<string[]>([])
  const [models, setModels]     = useState<string[]>([])
  const [variants, setVariants] = useState<string[]>([])
  const [maxPrice, setMaxPrice] = useState<number>(0)

  // Facet-API helper
  const fetchFacets = async (filters: any) => {
    const res = await fetch('/api/filter_cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters, includeItems: false })
    })
    if (!res.ok) throw new Error(await res.text())
    return (await res.json()) as FacetsResponse
  }

  // 1️⃣ initial load: merken + prijs‐range
  useEffect(() => {
    fetchFacets({})
      .then(data => {
        setBrands(data.facets.brands.options)
        const [min, max] = data.ranges.price
        setMaxPrice(max)
        setPriceRange([min, max])
      })
      .catch(console.error)
  }, [])

  // 2️⃣ bij wijziging merk: update modellen (en filter oude)
  useEffect(() => {
    if (brandSelected.length === 0) {
      setModels([])
      setModelSelected([])
      setVariants([])
      setVariantSelected([])
      return
    }
    fetchFacets({ brand: brandSelected })
      .then(data => {
        setModels(data.facets.models.options)
        setModelSelected(prev => prev.filter(m => data.facets.models.options.includes(m)))
      })
      .catch(console.error)
  }, [brandSelected])

  // 3️⃣ bij wijziging model: update varianten (en filter oude)
  useEffect(() => {
    if (modelSelected.length === 0) {
      setVariants([])
      setVariantSelected([])
      return
    }
    fetchFacets({ brand: brandSelected, model: modelSelected })
      .then(data => {
        setVariants(data.facets.variants.options)
        setVariantSelected(prev => prev.filter(v => data.facets.variants.options.includes(v)))
      })
      .catch(console.error)
  }, [modelSelected])

  // 4️⃣ zoek-knop
  const onSearch = () => {
    const filters: any = {}
    if (brandSelected.length)   filters.brand   = brandSelected
    if (modelSelected.length)   filters.model   = modelSelected
    if (variantSelected.length) filters.variant = variantSelected
    filters.price_min = priceRange[0]
    filters.price_max = priceRange[1]

    navigate('/collection', {
      state: { filters, includeItems: true }
    })
  }

  return (
    <>
      {/* HERO */}
      <section
        className="
          relative w-screen h-[85vh] md:h-[80vh]
          !bg-[url('/assets/hero/slide1.jpg')] !bg-cover !bg-center
          flex items-center justify-start pb-10
        "
      >
        <div className="absolute inset-0 !bg-black/60" />
        <div className="relative w-3/4 mx-auto px-6 text-left text-white">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 mt-24">
            Welkom bij AVS Autoverkoop
          </h1>
          <p className="text-lg md:text-2xl mb-6">
            Kwaliteit en betrouwbaarheid sinds 2004
          </p>
          <button className="!bg-[#27408B] text-white px-6 py-3 rounded-lg text-base hover:!bg-[#0A1833] transition duration-300">
            Bekijk Onze Auto's
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
            options={models}
            selected={modelSelected}
            onChange={setModelSelected}
            disabled={brandSelected.length === 0}
          />
          <MultiSearchSelect
            label="Variant"
            options={variants}
            selected={variantSelected}
            onChange={setVariantSelected}
            disabled={modelSelected.length === 0}
          />

          <FilterRangeSlider
            label="Prijs"
            min={0}
            max={maxPrice}
            value={priceRange}
            onChange={setPriceRange}
            placeholderMin="0"
            placeholderMax={maxPrice.toString()}
          />

          <button
            onClick={onSearch}
            className="w-full py-3 !bg-[#27408B] text-white rounded-md flex items-center justify-center space-x-2 hover:!bg-[#0A1833] transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg"
                 className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 
                       6.75 6.75a7.5 7.5 0 0 0 10.6 10.6z" />
            </svg>
            <span>Zoek</span>
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
              options={models}
              selected={modelSelected}
              onChange={setModelSelected}
              disabled={brandSelected.length === 0}
            />
            <MultiSearchSelect
              label="Variant"
              options={variants}
              selected={variantSelected}
              onChange={setVariantSelected}
              disabled={modelSelected.length === 0}
            />
          </div>
          <div className="flex items-center gap-6">
            <FilterRangeSlider
              label="Prijs"
              min={0}
              max={maxPrice}
              value={priceRange}
              onChange={setPriceRange}
              placeholderMin="0"
              placeholderMax={maxPrice.toString()}
            />
            <button
              onClick={onSearch}
              className="w-72 h-14 !bg-[#27408B] text-white rounded-md flex items-center justify-center space-x-2 text-lg hover:!bg-[#0A1833] transition"
            >
              <span>Zoek</span>
            </button>
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
              options={models}
              selected={modelSelected}
              onChange={setModelSelected}
              disabled={brandSelected.length === 0}
            />
          </div>
          <div className="w-60">
            <MultiSearchSelect
              label="Variant"
              options={variants}
              selected={variantSelected}
              onChange={setVariantSelected}
              disabled={modelSelected.length === 0}
            />
          </div>

          <div className="w-80">
            <FilterRangeSlider
              label="Prijs"
              min={0}
              max={maxPrice}
              value={priceRange}
              onChange={setPriceRange}
              placeholderMin="0"
              placeholderMax={maxPrice.toString()}
            />
          </div>

          <button
            onClick={onSearch}
            className="w-72 h-14 !bg-[#27408B] text-white rounded-md flex items-center justify-center space-x-2 text-lg hover:!bg-[#0A1833] transition"
          >
            <span>Zoek</span>
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
