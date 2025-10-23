import React from 'react';
import { 
  FaFacebookF, 
  FaInstagram, 
  FaWhatsapp, 
  FaPhoneAlt, 
  FaEnvelope 
} from 'react-icons/fa';

const TopBar = () => {
  return (
    <div className="fixed top-0 left-0 right-0 w-full h-10 bg-[#27408B] z-[100]">
      <div className="w-full lg:w-[80vw] max-w-[1280px] mx-auto flex justify-between items-center h-full px-4 sm:px-6">
        
        {/* Contact Info */}
        <div className="flex items-center space-x-4">
          <a 
            href="tel:+31612345678"
            className="flex items-center !text-white !hover:!text-gray-300 transition-transform duration-300 ease-in-out hover:scale-110"
          >
            <FaPhoneAlt className="!text-white" />
            <span className="ml-2 text-sm !text-white hidden md:inline">+31 6 12345678</span>
          </a>
          <a 
            href="mailto:info@avsautoverkoop.nl"
            className="flex items-center !text-white !hover:!text-gray-300 transition-transform duration-300 ease-in-out hover:scale-110"
          >
            <FaEnvelope className="!text-white" />
            <span className="ml-2 text-sm !text-white hidden md:inline">info@avsautoverkoop.nl</span>
          </a>
        </div>
        
        {/* Social Media Icons */}
        <div className="flex items-center space-x-4">
          {[
            { href: 'https://facebook.com', icon: <FaFacebookF /> },
            { href: 'https://instagram.com', icon: <FaInstagram /> },
            { href: 'https://wa.me/31612345678', icon: <FaWhatsapp /> },
          ].map(({ href, icon }, i) => (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="!text-white !hover:!text-gray-300 transition-transform duration-300 ease-in-out hover:scale-110"
            >
              {React.cloneElement(icon, { className: 'text-lg !text-white' })}
            </a>
          ))}
        </div>

      </div>
    </div>
  );
};

export default TopBar;
