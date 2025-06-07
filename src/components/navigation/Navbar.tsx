import React, { useState, useRef } from "react";
import NavLink from "./NavLink";
import { Bars3Icon, XMarkIcon, UserIcon } from "@heroicons/react/24/outline";

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
        className="
          fixed top-10 left-0 transform-none
          w-full h-20
          bg-white shadow-md
          flex items-center justify-between
          px-6 rounded-b-lg
          z-50
      
          /* desktop: 75% breed, gecentreerd */
          lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:w-3/4 lg:rounded-b-lg
        "
      >
        {/* Logo */}
        <a href="/" className="inline-flex items-center">
          <img
            src="/assets/avs-icon.svg"
            alt="AutoVerkoop Logo"
            className="h-10 w-auto"
          />
        </a>

        <ul className="flex gap-8 max-[1300px]:hidden">
          <li><NavLink href="/">Home</NavLink></li>
          <li><NavLink href="/collectie">Collectie</NavLink></li>
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
                absolute left-0 w-56 bg-white
                shadow-lg overflow-hidden
                transition-all duration-500 ease-out
                mt-7 py-4
                space-y-2
                rounded-bl-lg rounded-br-lg
                ${isDropdownOpen 
                  ? "opacity-100 scale-y-100 translate-y-0" 
                  : "opacity-0 scale-y-75 -translate-y-2"
                }`}
              style={{ transformOrigin: "top" }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <li className="pl-4"><NavLink href="#">Autoverkoop</NavLink></li>
              <li className="pl-4"><NavLink href="#">Auto zoeken</NavLink></li>
            </ul>
          </li>
          <li><NavLink href="#">Over Ons</NavLink></li>
          <li><NavLink href="#">Contact</NavLink></li>
        </ul>

        <div className="block max-[1300px]:hidden">
          <NavLink href="#" className="inline-flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#0A0A0A]" />
            Inloggen
          </NavLink>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="hidden max-[1300px]:block z-50 !bg-transparent !border-none !outline-none appearance-none group"
        >
          <Bars3Icon
            className={`w-8 h-8 transition-transform duration-300 ease-in-out hover:scale-110
              ${isMobileMenuOpen ? "text-[#27408B]" : "text-[#0A0A0A]"}
              group-hover:text-[#27408B]
              group-focus:text-[#27408B]`}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:hidden !z-[110]`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          {/* Mobile logo */}
          <a href="/" className="inline-flex items-center">
            <img
              src="/assets/avs-icon.svg"
              alt="AutoVerkoop Logo"
              className="h-10 w-auto"
            />
          </a>
          <button
            className="text-[#0A0A0A] focus:outline-none !bg-transparent !border-none transition-colors duration-300 hover:text-[#1C448E]"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <XMarkIcon className="w-8 h-8 transition-transform duration-300 ease-in-out hover:text-[#1C448E] hover:rotate-90" />
          </button>
        </div>

        <ul className="flex flex-col mt-6 space-y-6 px-6">
          <li><NavLink href="/">Home</NavLink></li>
          <li><NavLink href="/collectie">Collectie</NavLink></li>

          <li>
            <NavLink
              href="#"
              chevron
              isOpen={isMobileDropdownOpen}
              className="w-full justify-between text-base"
              onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
            >
              Diensten
            </NavLink>
            <ul className={`pl-2 mt-2 space-y-1 transition-all duration-300 overflow-hidden ${isMobileDropdownOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
              <li><NavLink href="#">Autoverkoop</NavLink></li>
              <li><NavLink href="#">Auto zoeken</NavLink></li>
            </ul>
          </li>

          <li><NavLink href="#">Over Ons</NavLink></li>
          <li><NavLink href="#">Contact</NavLink></li>

          <li>
            <NavLink href="#" className="flex items-center gap-2 text-base">
              <UserIcon className="w-6 h-6 text-[#0A0A0A]" />
              Inloggen
            </NavLink>
          </li>
        </ul>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 !z-[105]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;
