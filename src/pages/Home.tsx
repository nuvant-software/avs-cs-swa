import React, { useState } from 'react'
import FilterRangeSlider from '../components/filters/FilterRangeSlider'
import MultiSearchSelect from '../components/filters/MultiSearchSelect'

const Home: React.FC = () => {
  const brands = ['Mercedes-Benz', 'BMW', 'Tesla']
  const models = ['A-Klasse', 'Model S', 'Model 3']
  const variants = ['MERVAR7', 'MERVAR8', 'TESVAR1']

  // nu array-states
  const [brandSelected, setBrandSelected] = useState<string[]>([])
  const [modelSelected, setModelSelected] = useState<string[]>([])
  const [variantSelected, setVariantSelected] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000])

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

      <div className="relative w-screen">
        {/* mobile (sm < md) */}
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
          />
          <MultiSearchSelect
            label="Variant"
            options={variants}
            selected={variantSelected}
            onChange={setVariantSelected}
          />

          <FilterRangeSlider
            label="Prijs"
            min={0}
            max={100000}
            value={priceRange}
            onChange={setPriceRange}
            placeholderMin="0"
            placeholderMax="100k"
          />

          <button className="w-full py-3 !bg-[#27408B] text-white rounded-md flex items-center justify-center space-x-2 hover:!bg-[#0A1833] transition">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.75 6.75a7.5 7.5 0 0 0 10.6 10.6z"
              />
            </svg>
            <span>10 Auto’s</span>
          </button>
        </div>

        {/* tablet (md ≤ w < lg) */}
        <div className="hidden md:flex lg:hidden flex-col space-y-4 mx-auto w-3/4 px-6 py-6 !bg-white shadow-lg rounded-lg -mt-20 relative z-20">
          <div
            className="
              absolute top-0 left-6 -translate-y-full !bg-[#27408B] text-white
              px-8 py-3 rounded-t-sm text-lg md:text-xl
              before:content-[''] before:absolute before:top-full before:left-1/2
              before:-translate-x-1/2 before:border-l-6 before:border-r-6
              before:border-t-6 before:border-l-transparent
              before:border-r-transparent before:border-t-[#27408B]
            "
          >
            Auto zoeken
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <MultiSearchSelect
                label="Merk"
                options={brands}
                selected={brandSelected}
                onChange={setBrandSelected}
              />
            </div>
            <div className="flex-1">
              <MultiSearchSelect
                label="Model"
                options={models}
                selected={modelSelected}
                onChange={setModelSelected}
              />
            </div>
            <div className="flex-1">
              <MultiSearchSelect
                label="Variant"
                options={variants}
                selected={variantSelected}
                onChange={setVariantSelected}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <FilterRangeSlider
                label="Prijs"
                min={0}
                max={100000}
                value={priceRange}
                onChange={setPriceRange}
                placeholderMin="0"
                placeholderMax="100k"
              />
            </div>
            <button className="w-72 h-14 !bg-[#27408B] text-white rounded-md flex items-center justify-center space-x-2 text-lg hover:!bg-[#0A1833] transition">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.75 6.75a7.5 7.5 0 0 0 10.6 10.6z"
                />
              </svg>
              <span>10 Auto’s</span>
            </button>
          </div>
        </div>

        {/* desktop (lg+) */}
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
            />
          </div>
          <div className="w-60">
            <MultiSearchSelect
              label="Variant"
              options={variants}
              selected={variantSelected}
              onChange={setVariantSelected}
            />
          </div>

          <div className="w-80">
            <FilterRangeSlider
              label="Prijs"
              min={0}
              max={100000}
              value={priceRange}
              onChange={setPriceRange}
              placeholderMin="0"
              placeholderMax="100k"
            />
          </div>

          <button className="w-72 h-14 !bg-[#27408B] text-white rounded-md flex items-center justify-center space-x-2 text-lg hover:!bg-[#0A1833] transition">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.75 6.75a7.5 7.5 0 0 0 10.6 10.6z"
              />
            </svg>
            <span>10 Auto’s</span>
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
