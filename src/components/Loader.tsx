import React from 'react'
import { OrbitProgress } from 'react-loading-indicators'

interface LoaderProps {
  message?: string
}

const Loader: React.FC<LoaderProps> = ({ message }) => (
  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
    <OrbitProgress
      variant="split-disc"
      color="#0044ff"
      size="medium"
      text=""
      textColor=""
    />
    {message && <p className="mt-4 text-gray-700">{message}</p>}
  </div>
)

export default Loader
