import React, { useState, useRef } from 'react';
import NavLink from './NavLink';
import { Bars3Icon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';

const Navbar: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsDropdownOpen(true);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 200);
  };

  return (
    <>
      <nav
        className={`
          fixed top-10 left-0 transform-none
          w-full h-20 bg-white shadow-md
          flex items-center justify-between px-6 rounded-b-lg z-50
          lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:w-3/4
        `}
      >
        {/* Logo */}
        <NavLink href="/" className="p-0">
          <img src="/assets/avs-icon.svg" alt="Logo" className="h-10" />
        </NavLink>

        {/* Desktop links */}
        <ul className="flex gap-8 max-[1300px]:hidden">
          <li><NavLink href="/">Home</NavLink></li>
          <li><NavLink href="/collection">Collectie</NavLink></li>
          <li
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <NavLink href="#" chevron isOpen={isDropdownOpen}>
              Diensten
            </NavLink>
            <ul
              className={`
                absolute left-0 w-56 bg-white shadow-lg mt-7 py-4 space-y-2
                rounded-b-lg transition-all duration-500 ease-out
                ${isDropdownOpen
                  ? 'opacity-100 scale-y-100 translate-y-0'
                  : 'opacity-0 scale-y-75 -translate-y-2'}
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
        <div className="block max-[1300px]:hidden">
          <NavLink href="#" className="inline-flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#0A0A0A]" />
            Inloggen
          </NavLink>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="hidden max-[1300px]:block bg-transparent border-none z-50"
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
          transition-transform duration-300 ease-in-out lg:hidden z-[110]
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <NavLink href="/" className="p-0" onClick={() => setIsMobileMenuOpen(false)}>
            <img src="/assets/avs-icon.svg" alt="Logo" className="h-10" />
          </NavLink>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="bg-transparent border-none"
          >
            <XMarkIcon className="w-8 h-8 hover:rotate-90 transition-transform" />
          </button>
        </div>
        <ul className="mt-6 space-y-6 px-6">
          <li><NavLink href="/" onClick={() => setIsMobileMenuOpen(false)}>Home</NavLink></li>
          <li><NavLink href="/collection" onClick={() => setIsMobileMenuOpen(false)}>Collectie</NavLink></li>
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
            <ul className={`
              pl-2 mt-2 space-y-1 overflow-hidden transition-all duration-300
              ${isMobileDropdownOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}
            `}>
              <li><NavLink href="#" onClick={() => setIsMobileMenuOpen(false)}>Autoverkoop</NavLink></li>
              <li><NavLink href="#" onClick={() => setIsMobileMenuOpen(false)}>Auto zoeken</NavLink></li>
            </ul>
          </li>
          <li><NavLink href="#" onClick={() => setIsMobileMenuOpen(false)}>Over Ons</NavLink></li>
          <li><NavLink href="#" onClick={() => setIsMobileMenuOpen(false)}>Contact</NavLink></li>
          <li>
            <NavLink
              href="#"
              className="flex items-center gap-2 text-base"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <UserIcon className="w-6 h-6 text-[#0A0A0A]" /> Inloggen
            </NavLink>
          </li>
        </ul>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[105]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;
