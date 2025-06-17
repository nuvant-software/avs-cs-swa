import React from 'react';
import { Link, type LinkProps } from 'react-router-dom';

// We extenden van LinkProps (minus 'to'), zodat className, onClick, etc. er al inzitten
interface NavLinkProps extends Omit<LinkProps, 'to'> {
  href: string;
  children: React.ReactNode;
  chevron?: boolean;
  isOpen?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({
  href,
  children,
  chevron,
  isOpen,
  className,
  ...linkProps
}) => {
  return (
    <Link
      to={href}
      className={`group relative inline-flex items-center gap-2 text-lg
        text-[#27408B] hover:text-[#27408B]
        transition-colors duration-300 ${className ?? ''}`}
      {...linkProps}
    >
      {React.Children.map(children, (child) => {
        // narrowen tot ReactElement zodat we props kunnen lezen
        if (React.isValidElement(child)) {
          const element = child as React.ReactElement<{ className?: string }>;
          return React.cloneElement(element, {
            className: `
              text-[#0A0A0A] group-hover:text-[#27408B]
              transition-colors duration-300
              ${element.props.className ?? ''}
            `,
          });
        }
        if (typeof child === 'string') {
          return (
            <span className="relative">
              <span
                className={`
                  after:absolute after:bottom-0 after:left-0
                  after:h-[2px] after:w-full after:bg-[#27408B]
                  after:scale-x-0 after:origin-bottom-left
                  after:transition-transform after:duration-300
                  group-hover:after:scale-x-100
                  text-[#0A0A0A] group-hover:text-[#27408B]
                  transition-colors duration-300
                `}
              >
                {child}
              </span>
            </span>
          );
        }
        return child;
      })}

      {chevron && (
        <div
          className={`
            w-2 h-2 border-l-2 border-b-2 border-[#0A0A0A]
            transition-all duration-300
            ${isOpen ? 'rotate-[135deg] mt-[2px]' : 'rotate-[-45deg]'}
          `}
        />
      )}
    </Link>
  );
};

export default NavLink;
