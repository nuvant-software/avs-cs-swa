// src/pages/Collection.tsx
import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Loader from '../components/Loader'

interface LocationState {
  filters: Record<string, any>
  includeItems: boolean
}

const Collection: React.FC = () => {
  const location = useLocation()
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string|null>(null)

  useEffect(() => {
    // bepaal filters: óf uit location.state, óf leeg object
    const state = (location.state as LocationState | undefined) ?? {
      filters: {},
      includeItems: true,
    }

    const fetchData = async () => {
      try {
        setLoading(true)  // reset loading bij elke navigatie
        setError(null)

        const res = await fetch('/api/filter_cars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: state.filters,
            includeItems: true,
          }),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || res.statusText)
        }
        const json = await res.json()
        setData(json)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [location])  // álleen dependency op `location`

  if (loading) {
    return <Loader message="Bezig met laden…" />
  }
  if (error) {
    return <Loader message={`Fout: ${error}`} />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Auto Collectie</h1>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export default Collection
