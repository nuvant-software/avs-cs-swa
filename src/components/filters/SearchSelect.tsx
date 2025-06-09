import React, { useState, useRef, useEffect } from 'react'

interface SearchSelectProps {
  label: string
  options: string[]
  value: string
  onChange: (val: string) => void
}

const SearchSelect: React.FC<SearchSelectProps> = ({
  label,
  options,
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // klik-buiten sluit dropdown
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative w-full" ref={ref}>
      {/* toggle button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`
          w-full text-left py-3 px-4 border bg-white rounded-sm
          ${value ? 'text-gray-900' : 'text-gray-400'}
          focus:outline-none focus:ring-2 focus:ring-blue-500
          inline-flex items-center justify-between
        `}
      >
        {value || label}
        <svg
          className="w-4 h-4 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 10 6"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="m1 1 4 4 4-4"
          />
        </svg>
      </button>

      {/* dropdown pane */}
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-sm shadow-sm">
          <div className="p-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                  />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 p-2 text-sm border border-gray-300 rounded-sm bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Zoek ${label.toLowerCase()}`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <ul className="max-h-40 overflow-y-auto text-sm text-gray-700">
            {filtered.slice(0, 3).map(opt => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt)
                    setSearch('')
                    setOpen(false)
                  }}
                  className="w-full text-left py-2 px-3 hover:bg-gray-100"
                >
                  {opt}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-2 px-3 text-gray-500 italic">
                Geen resultaten
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default SearchSelect
