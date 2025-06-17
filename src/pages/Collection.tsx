// src/pages/Collection.tsx
import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Loader from '../components/Loader'

interface LocationState {
  filters?: Record<string, any>
  includeItems?: boolean
}

interface ApiResponse {
  items?: Array<{
    car_overview: {
      brand: string
      model: string
      variant: string
      price: number
      [key: string]: any
    }
    [key: string]: any
  }>
  [key: string]: any
}

const Collection: React.FC = () => {
  const location = useLocation()
  // haal filters/state mee, of gebruik defaults
  const navState = (location.state as LocationState) ?? {}
  const filters = navState.filters ?? {}
  const includeItems = navState.includeItems ?? true

  const [data,    setData]    = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string|null>(null)

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

        // prijs-range alsnog client-side filteren
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
  }, [])  // <<< éénmalig bij mount

  if (loading) return <Loader/>
  if (error)   return <Loader/>

  const items = data?.items ?? []

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Auto Collectie</h1>
      <p className="mb-4">Aantal auto's: {items.length}</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        {JSON.stringify(items, null, 2)}
      </pre>
    </div>
  )
}

export default Collection
