import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NavLink from './NavLink'
import { Bars3Icon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline'
import { NAV_ELEVATION_SHADOW } from '../../constants/shadows'

const NAV_HEIGHT = 80 // h-20
const WIDE_NAV_WIDTH = '80vw'
const MAX_WIDE_WIDTH = 1280
const MIN_WIDE_BREAKPOINT = 1024
const SCROLL_SOLID_THRESHOLD = 32

const Navbar: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false)

  // nav-mode besturing + metingen
  const [desiredMode, setDesiredMode] = useState<'overlay'|'solid'>('overlay')
  const [scrollSolid, setScrollSolid] = useState<boolean>(false)
  const rowRef = useRef<HTMLDivElement | null>(null)

  const computeIsNarrow = () => {
    if (typeof window === 'undefined') return false
    const { innerWidth: width, innerHeight: height } = window
    const isLandscape = width >= height
    const wideEnough = width >= MIN_WIDE_BREAKPOINT
    return !(isLandscape && wideEnough)
  }

  const [isNarrow, setIsNarrow] = useState<boolean>(() => computeIsNarrow())
  useEffect(() => {
    const update = () => setIsNarrow(computeIsNarrow())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  const mode = useMemo<'overlay'|'solid'>(() => {
    return scrollSolid || desiredMode === 'solid' ? 'solid' : 'overlay'
  }, [scrollSolid, desiredMode])

  const measureAndBroadcast = useCallback(() => {
    const el = rowRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    window.dispatchEvent(
      new CustomEvent('avs:nav-metrics', {
        detail: { bottom: rect.bottom, height: rect.height, mode },
      })
    )
  }, [mode])

  useEffect(() => {
    const onMode = (e: Event) => {
      const ce = e as CustomEvent<{ mode: 'overlay'|'solid' }>
      setDesiredMode(ce.detail.mode)
    }
    const onRequestMetrics = () => measureAndBroadcast()
    window.addEventListener('avs:nav-mode', onMode)
    window.addEventListener('avs:request-nav-metrics', onRequestMetrics)
    return () => {
      window.removeEventListener('avs:nav-mode', onMode)
      window.removeEventListener('avs:request-nav-metrics', onRequestMetrics)
    }
  }, [measureAndBroadcast])

  useEffect(() => {
    const handler = () => measureAndBroadcast()
    window.addEventListener('resize', handler)
    handler()
    return () => {
      window.removeEventListener('resize', handler)
    }
  }, [measureAndBroadcast])

  useEffect(() => {
    const handleScroll = () => {
      const shouldBeSolid = window.scrollY > SCROLL_SOLID_THRESHOLD
      setScrollSolid(prev => (prev === shouldBeSolid ? prev : shouldBeSolid))
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => { measureAndBroadcast() }, [measureAndBroadcast, isMobileMenuOpen, isNarrow, mode])

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleMouseEnter = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setIsDropdownOpen(true) }
  const handleMouseLeave = () => { timeoutRef.current = setTimeout(() => setIsDropdownOpen(false), 200) }

  // ─────────────────────────────────────────────────────────────
  // Lagen:
  // - wrapper: fixed, full-width (voor klikgebied)
  // - bgBar: absolute witte balk die van 75% → 100% animerend gaat
  // - row:   absolute contentrij (logo/links) die 75% blijft (desktop)
  // ─────────────────────────────────────────────────────────────

  const topOverlay = '2.5rem' // top-10
  const topSolid = topOverlay

  // WITTE ACHTERGRONDBALK (alleen deze schuift uit)
  const bgBarStyle = useMemo<React.CSSProperties>(() => {
    const overlay: React.CSSProperties = isNarrow
      ? {
          top: topOverlay,
          left: 0,
          transform: 'none',
          width: '100%',
          height: NAV_HEIGHT,
          maxWidth: '100%',
          borderBottomLeftRadius: '0.75rem',
          borderBottomRightRadius: '0.75rem',
        }
      : {
          top: topOverlay,
          left: '50%',
          transform: 'translateX(-50%)',
          width: WIDE_NAV_WIDTH,
          height: NAV_HEIGHT,
          maxWidth: `${MAX_WIDE_WIDTH}px`,
          borderBottomLeftRadius: '0.75rem',
          borderBottomRightRadius: '0.75rem',
        }
      const solid: React.CSSProperties = isNarrow
      ? {
          top: topSolid,
          left: 0,
          transform: 'none',
          width: '100%',
          height: NAV_HEIGHT,
          maxWidth: '100%',
          borderBottomLeftRadius: '0px',
          borderBottomRightRadius: '0px',
        }
      : {
          top: topSolid,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          height: NAV_HEIGHT,
          maxWidth: '100%',
          borderBottomLeftRadius: '0px',
          borderBottomRightRadius: '0px',
        }
    return {
      position: 'absolute',
      backgroundColor: '#fff',
      zIndex: 40, // onder content-row (z-50) maar boven pagina
      boxShadow: NAV_ELEVATION_SHADOW,
      transition: 'top 300ms ease, transform 300ms ease, width 300ms ease, max-width 300ms ease, border-radius 300ms ease, box-shadow 300ms ease',
      ...(mode === 'overlay' ? overlay : solid),
    }
  }, [mode, isNarrow])

  // CONTENT-RIJ (blijft 75% gecentreerd op desktop; 100% op smalle viewports)
  const rowStyle = useMemo<React.CSSProperties>(() => {
    const shouldCenter = !isNarrow
    const width = isNarrow ? '100%' : WIDE_NAV_WIDTH
    const maxWidth = isNarrow ? '100%' : `${MAX_WIDE_WIDTH}px`
    return {  
      position: 'absolute',
      top: mode === 'overlay' ? topOverlay : topSolid,
      left: shouldCenter ? '50%' : 0,
      transform: shouldCenter ? 'translateX(-50%)' : 'none',
      width,
      maxWidth,
      height: NAV_HEIGHT,
      zIndex: 50,
      transition: 'top 300ms ease, transform 300ms ease, width 300ms ease, max-width 300ms ease',
      paddingLeft: '1.5rem',
      paddingRight: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }
  }, [mode, isNarrow])

  return (
    <>
      {/* Wrapper */}
       <nav className="fixed inset-x-0 top-0 z-50" style={{ height: 0 }}>
        {/* Achtergrondbalk die uitschuift */}
        <div style={bgBarStyle} />

        {/* Contentrij (logo/links/knoppen) */}
        <div ref={rowRef} style={rowStyle}>
          {/* Logo */}
          <NavLink href="/" className="p-0">
            <img src="/assets/avs-icon.svg" alt="Logo" className="h-10" />
          </NavLink>

          {/* Desktop links */}
          <ul className="hidden lg:flex gap-8">
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
          <div className="hidden lg:block">
            <NavLink href="#" className="inline-flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-[#0A0A0A]" /> Inloggen
            </NavLink>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden bg-transparent border-none"
          >
            <Bars3Icon
              className={`
                w-8 h-8 transition-transform duration-300 hover:scale-110
                ${isMobileMenuOpen ? 'text-[#27408B]' : 'text-[#0A0A0A]'}
              `}
            />
          </button>
        </div>
      </nav>

      {/* Mobile sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 !bg-white shadow-lg transform
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
