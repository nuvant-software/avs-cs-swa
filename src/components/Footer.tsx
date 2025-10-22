import type { FC } from 'react';

const Footer: FC = () => {
  return (
    <footer className="w-full bg-[#0A1833] text-white">
      {/* Inner content centered, with max width */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-1">AVS Autoverkoop</h3>
            <p className="text-sm">© 2024 Alle rechten voorbehouden</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm">KvK: 12345678</p>
            <p className="text-sm">BTW: NL123456789B01</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
