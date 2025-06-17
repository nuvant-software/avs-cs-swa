import React from 'react'

interface LoaderProps {
  message?: string
}

const Loader: React.FC<LoaderProps> = ({ message }) => (
  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
    <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    {message && <p className="mt-4 text-gray-700">{message}</p>}
  </div>
)

export default Loader
