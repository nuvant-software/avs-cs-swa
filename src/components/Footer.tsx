import type { FC } from 'react';

const Footer: FC = () => {
  return (
    <footer className="bg-[#0A1833] text-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold mb-2">AVS Autoverkoop</h3>
            <p className="text-sm">© 2024 Alle rechten voorbehouden</p>
          </div>
          <div>
            <p className="text-sm">KvK: 12345678</p>
            <p className="text-sm">BTW: NL123456789B01</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 