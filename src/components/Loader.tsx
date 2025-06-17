// src/components/Loader.tsx
import React from 'react'

interface LoaderProps {
  /** optioneel, gebruikt voor aria-label maar niet visueel getoond */
  message?: string
}

const Loader: React.FC<LoaderProps> = ({ message }) => (
  <div
    role="status"
    aria-label={message}
    className="fixed inset-0 bg-white flex items-center justify-center z-50"
  >
    <div className="relative w-16 h-16">
      {/* Buitenste ring */}
      <div
        className="absolute inset-0 border-8 border-[#27408B] border-t-transparent rounded-full"
        style={{ animation: 'spin 1.5s cubic-bezier(0.4,0,0.2,1) infinite' }}
      />
      {/* Binnenste ring */}
      <div
        className="absolute inset-0 m-4 border-8 border-[#27408B] border-b-transparent rounded-full"
        style={{ animation: 'spin 1s cubic-bezier(0.4,0,0.2,1) infinite' }}
      />
    </div>
  </div>
)

export default Loader
