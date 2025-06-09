import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const Collection: React.FC = () => {
  const { state } = useLocation() as {
    state: { filters: any; includeItems: boolean }
  }
  const [result, setResult] = useState<any>(null)
  const [error, setError]   = useState<string|null>(null)

  useEffect(() => {
    if (!state) {
      setError('Geen filters doorgegeven.')
      return
    }
    fetch('/api/filter_cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    })
      .then(res => {
        if (!res.ok) throw new Error(`(${res.status}) ${res.statusText}`)
        return res.json()
      })
      .then(json => setResult(json))
      .catch(err => setError(err.message))
  }, [state])

  if (error) return <div className="p-4 text-red-600">Fout: {error}</div>
  if (!result) return <div className="p-4">Laden…</div>

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Auto Collectie</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}

export default Collection
