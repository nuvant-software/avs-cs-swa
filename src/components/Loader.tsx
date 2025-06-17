// src/components/Loader.tsx
import React from 'react'
import { OrbitProgress } from 'react-loading-indicators'

const Loader: React.FC = () => (
  <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
    <OrbitProgress 
      variant="split-disc" 
      color="#27408B" 
      size="medium" 
      text="" 
      textColor="" />
  </div>
)

export default Loader
