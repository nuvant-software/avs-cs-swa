import React, { useState, useRef, useEffect } from 'react'

interface MultiSearchSelectProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean              // ← nieuw
}

const MultiSearchSelect: React.FC<MultiSearchSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  disabled = false,               // ← default
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // klik buiten sluit dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  )

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`
          w-full text-left py-3 px-4 border bg-white rounded-sm
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${selected.length === 0 ? 'text-gray-400' : 'text-gray-900'}
          focus:outline-none focus:ring-2 focus:ring-blue-500
          inline-flex items-center justify-between
        `}
      >
        {selected.length > 0 ? selected.join(', ') : label}
        <svg
          className="w-4 h-4 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 10 6"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m1 1 4 4 4-4" />
        </svg>
      </button>

      {open && !disabled && (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
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
            {filtered.map(opt => (
              <li key={opt}>
                <label className="flex items-center py-2 px-3 hover:bg-gray-100 w-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggleOption(opt)}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded-sm focus:ring-blue-500"
                  />
                  <span>{opt}</span>
                </label>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-2 px-3 text-gray-500 italic">Geen resultaten</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default MultiSearchSelect
