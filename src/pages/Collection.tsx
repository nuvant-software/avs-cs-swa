// src/pages/Collection.tsx
import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Loader from '../components/Loader'

interface LocationState {
  filters?: Record<string, any>
  includeItems?: boolean
}

interface CarOverview {
  brand: string
  model: string
  variant: string
  year?: number
  mileage?: number
  transmission?: string
  fuel_type?: string
  engine_size?: string
  pk?: number
  price: number
  [key: string]: any
}

interface ApiResponse {
  items?: Array<{
    car_overview: CarOverview
    [key: string]: any
  }>
  [key: string]: any
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
  if (error) return <Loader />

  const items = data?.items ?? []

  return (
    <>
      {/* Hero Section */}
      <section
        className="relative w-screen h-[400px] bg-[url('/assets/hero/slide2.jpg')] bg-cover bg-center flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-6xl font-bold">Onze Collectie</h1>
          <p className="text-lg mt-2">Bekijk het volledige aanbod</p>
        </div>
      </section>

      {/* Content */}
      <section className="w-screen py-16 bg-white">
        <div className="w-3/4 mx-auto px-4">
          <h2 className="text-2xl font-semibold mb-4">Aantal auto's: {items.length}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, idx) => {
              const car = item.car_overview
              return (
                <div key={idx} className="border rounded-lg p-4 shadow-sm bg-gray-50">
                  <h3 className="text-xl font-bold mb-2">
                    {car.brand} {car.model} {car.variant}
                  </h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li><strong>Bouwjaar:</strong> {car.year ?? 'Onbekend'}</li>
                    <li><strong>Kilometerstand:</strong> {car.mileage ? `${car.mileage.toLocaleString()} km` : 'Onbekend'}</li>
                    <li><strong>Transmissie:</strong> {car.transmission ?? 'Onbekend'}</li>
                    <li><strong>Brandstof:</strong> {car.fuel_type ?? 'Onbekend'}</li>
                    <li><strong>Motorinhoud:</strong> {car.engine_size ?? 'Onbekend'}</li>
                    <li><strong>Vermogen:</strong> {car.pk ? `${car.pk} PK` : 'Onbekend'}</li>
                    <li><strong>Prijs:</strong> € {car.price.toLocaleString()}</li>
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

export default Collection
