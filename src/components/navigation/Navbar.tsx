import React, { useEffect, useMemo, useRef, useState } from 'react'
import NavLink from './NavLink'
import { Bars3Icon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline'

const Navbar: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false)

  // nav-mode besturing + metingen
  const [mode, setMode] = useState<'overlay'|'solid'>('overlay')
  const navRef = useRef<HTMLElement | null>(null)

  // breakpoint (≲1366px) → altijd full width
  const [isNarrow, setIsNarrow] = useState<boolean>(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1366px)')
    const apply = () => setIsNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const measureAndBroadcast = () => {
    const el = navRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const bottom = Math.round(rect.bottom)
    const height = Math.round(rect.height)
    window.dispatchEvent(new CustomEvent('avs:nav-metrics', { detail: { bottom, height, mode } }))
  }

  useEffect(() => {
    const onMode = (e: Event) => {
      const ce = e as CustomEvent<{ mode: 'overlay'|'solid' }>
      setMode(ce.detail.mode)
    }
    const onRequestMetrics = () => measureAndBroadcast()
    window.addEventListener('avs:nav-mode', onMode)
    window.addEventListener('avs:request-nav-metrics', onRequestMetrics)
    return () => {
      window.removeEventListener('avs:nav-mode', onMode)
      window.removeEventListener('avs:request-nav-metrics', onRequestMetrics)
    }
  }, [])

  useEffect(() => {
    const handler = () => measureAndBroadcast()
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler)
    handler() // initial
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler)
    }
  }, [])

  useEffect(() => { measureAndBroadcast() }, [mode, isMobileMenuOpen, isNarrow])

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleMouseEnter = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setIsDropdownOpen(true) }
  const handleMouseLeave = () => { timeoutRef.current = setTimeout(() => setIsDropdownOpen(false), 200) }

  // 🔧 Geanimeerde stijl (width/left/transform/borderRadius/top)
  const navStyle = useMemo<React.CSSProperties>(() => {
    const overlay = {
      top: '2.5rem',                               // top-10
      left: isNarrow ? '0' : '50%',
      transform: isNarrow ? 'none' : 'translateX(-50%)',
      width: isNarrow ? '100%' : '75%',            // w-3/4 → animatie naar 100%
      borderBottomLeftRadius: '0.75rem',           // rounded-b-xl
      borderBottomRightRadius: '0.75rem',
    } as React.CSSProperties

    const solid = {
      top: '0px',
      left: '0px',
      transform: 'none',
      width: '100%',
      borderBottomLeftRadius: '0px',
      borderBottomRightRadius: '0px',
    } as React.CSSProperties

    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 50,
      transition: 'top 300ms ease, left 300ms ease, transform 300ms ease, width 300ms ease, border-radius 300ms ease',
    }

    return { ...base, ...(mode === 'overlay' ? overlay : solid) }
  }, [mode, isNarrow])

  return (
    <>
      <nav
        ref={navRef}
        style={navStyle}
        className={`
          flex items-center justify-between h-20 px-6 bg-white
          ${mode === 'overlay' ? 'shadow-lg' : 'shadow-md'}
        `}
      >
        {/* Logo */}
        <NavLink href="/" className="p-0">
          <img src="/assets/avs-icon.svg" alt="Logo" className="h-10" />
        </NavLink>

        {/* Desktop links */}
        <ul className="flex gap-8 max-[1366px]:hidden">
          <li><NavLink href="/">Home</NavLink></li>
          <li>
            <NavLink href="/collection" state={{ filters: {}, includeItems: true }}>
              Collectie
            </NavLink>
          </li>
          <li className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <NavLink href="#" chevron isOpen={isDropdownOpen}>
              Diensten
            </NavLink>
            <ul
              className={`
                absolute left-0 w-56 bg-white shadow-lg mt-7 py-4 space-y-2
                rounded-b-lg transition-all duration-500 ease-out
                ${isDropdownOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-75 -translate-y-2'}
              `}
              style={{ transformOrigin: 'top' }}
            >
              <li className="pl-4"><NavLink href="#">Autoverkoop</NavLink></li>
              <li className="pl-4"><NavLink href="#">Auto zoeken</NavLink></li>
            </ul>
          </li>
          <li><NavLink href="#">Over Ons</NavLink></li>
          <li><NavLink href="#">Contact</NavLink></li>
        </ul>

        {/* Desktop login */}
        <div className="block max-[1366px]:hidden">
          <NavLink href="#" className="inline-flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#0A0A0A]" /> Inloggen
          </NavLink>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="hidden max-[1366px]:block bg-transparent border-none z-50"
        >
          <Bars3Icon
            className={`
              w-8 h-8 transition-transform duration-300 hover:scale-110
              ${isMobileMenuOpen ? 'text-[#27408B]' : 'text-[#0A0A0A]'}
            `}
          />
        </button>
      </nav>

      {/* Mobile sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform
          transition-transform duration-300 ease-in-out hidden max-[1366px]:block z-[110]
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <NavLink href="/" className="p-0" onClick={() => setIsMobileMenuOpen(false)}>
            <img src="/assets/avs-icon.svg" alt="Logo" className="h-10" />
          </NavLink>
          <button onClick={() => setIsMobileMenuOpen(false)} className="bg-transparent border-none">
            <XMarkIcon className="w-8 h-8 hover:rotate-90 transition-transform" />
          </button>
        </div>
        <ul className="mt-6 space-y-6 px-6">
          <li><NavLink href="/" onClick={() => setIsMobileMenuOpen(false)}>Home</NavLink></li>
          <li>
            <NavLink
              href="/collection"
              state={{ filters: {}, includeItems: true }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Collectie
            </NavLink>
          </li>
          <li>
            <NavLink
              href="#"
              chevron
              isOpen={isMobileDropdownOpen}
              onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
              className="justify-between w-full"
            >
              Diensten
            </NavLink>
            <ul
              className={`
                pl-2 mt-2 space-y-1 overflow-hidden transition-all duration-300
                ${isMobileDropdownOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}
              `}
            >
              <li><NavLink href="#" onClick={() => setIsMobileMenuOpen(false)}>Autoverkoop</NavLink></li>
              <li><NavLink href="#" onClick={() => setIsMobileMenuOpen(false)}>Auto zoeken</NavLink></li>
            </ul>
          </li>
          <li><NavLink href="#" onClick={() => setIsMobileMenuOpen(false)}>Over Ons</NavLink></li>
          <li><NavLink href="#" onClick={() => setIsMobileMenuOpen(false)}>Contact</NavLink></li>
          <li>
            <NavLink href="#" className="flex items-center gap-2 text-base" onClick={() => setIsMobileMenuOpen(false)}>
              <UserIcon className="w-6 h-6 text-[#0A0A0A]" /> Inloggen
            </NavLink>
          </li>
        </ul>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 z-[105]" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </>
  )
}

export default Navbar
