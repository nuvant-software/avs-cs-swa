// src/pages/Collection.tsx
import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Loader from '../components/Loader'
import CarCard from '../components/CarCard'

interface LocationState {
  filters?: Record<string, any>
  includeItems?: boolean
}

interface ApiResponse {
  items?: Array<{
    id: string
    car_overview: {
      brand: string
      model: string
      variant: string
      price: number
      year?: number
      mileage?: number
      transmission?: string
      /** hier veranderd van fuel_type naar gewoon fuel */
      fuel?: string
      engine_size?: string
      pk?: number
    }
  }>
}

const Collection: React.FC = () => {
  const location = useLocation()
  const navState = (location.state as LocationState) ?? {}
  const filters = navState.filters ?? {}
  const includeItems = navState.includeItems ?? true

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/filter_cars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters, includeItems }),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || res.statusText)
        }
        const json: ApiResponse = await res.json()

        const { price_min, price_max } = filters
        if (
          typeof price_min === 'number' &&
          typeof price_max === 'number' &&
          Array.isArray(json.items)
        ) {
          json.items = json.items.filter(it => {
            const p = it.car_overview?.price
            return typeof p === 'number' && p >= price_min && p <= price_max
          })
        }

        setData(json)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <Loader />
  if (error)   return <Loader />

  const items = data?.items ?? []

  return (
    <>
      {/* Hero */}
      <section className="relative w-screen h-[400px] bg-[url('/assets/hero/slide2.jpg')] bg-cover bg-center flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-6xl font-bold">Onze Collectie</h1>
          <p className="text-lg mt-2">Bekijk het volledige aanbod</p>
        </div>
      </section>

      {/* Content */}
      <section className="w-screen py-16 bg-white">
        <div className="w-3/4 mx-auto px-4">
          <h2 className="text-2xl font-semibold mb-6">
            Aantal auto's: {items.length}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
            {items.map((item) => {
              const car = item.car_overview
              return (
                <CarCard
                  key={item.id}
                  car={{
                    id: item.id,
                    brand: car.brand,
                    model: car.model,
                    variant: car.variant,
                    /** hier de echte fuel uit de JSON pakken */
                    fuel: car.fuel ?? '',
                    mileage: car.mileage ?? 0,
                    transmission: car.transmission ?? '',
                    price: car.price,
                    year: car.year ?? 0,
                    engine_size: car.engine_size ?? '',
                    pk: car.pk ?? 0
                  }}
                  layout="grid"
                />
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

export default Collection
