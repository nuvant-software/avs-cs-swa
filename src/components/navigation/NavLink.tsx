import React from "react";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  chevron?: boolean;
  isOpen?: boolean;
  className?: string;
  onClick?: () => void; // ✅ voeg dit toe
}

const NavLink: React.FC<NavLinkProps> = ({
  href,
  children,
  chevron,
  isOpen,
  className,
  onClick, // ✅ destructure
}) => {
  return (
    <a
      href={href}
      onClick={onClick} // ✅ hier gebruiken
      className={`group relative inline-flex items-center gap-2 text-lg text-[#27408B] hover:text-[#27408B] transition-colors duration-300 ${className || ""}`}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const element = child as React.ReactElement<any>;
          return React.cloneElement(element, {
            className: `text-[#0A0A0A] group-hover:text-[#27408B] transition-colors duration-300 ${element.props.className || ""}`,
          });
        }

        if (typeof child === "string") {
          return (
            <span className="relative">
              <span
                className={`after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-[#27408B]
                            after:scale-x-0 after:origin-bottom-left after:transition-transform after:duration-300
                            group-hover:after:scale-x-100 group-hover:after:bg-[#27408B]
                            text-[#0A0A0A] group-hover:text-[#27408B] transition-colors duration-300`}
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
          className={`w-2 h-2 border-l-2 border-b-2 border-[#0A0A0A] transition-all duration-300 group-hover:border-[#27408B] ${
            isOpen ? "rotate-[135deg] mt-[2px]" : "rotate-[-45deg]"
          }`}
        />
      )}
    </a>
  );
};

export default NavLink;
