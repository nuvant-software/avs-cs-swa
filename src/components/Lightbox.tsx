// src/components/Lightbox.tsx
import { useEffect } from "react";
import type { FC } from "react";
import { createPortal } from "react-dom";

interface Props {
  images: string[];
  index: number;
  open: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (i: number) => void;
}

export const Lightbox: FC<Props> = ({
  images,
  index,
  open,
  onClose,
  onPrev,
  onNext,
  onSelect,
}) => {
  // sluit op Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onPrev, onNext]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center !bg-black/80 p-4">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 !bg-transparent !border-none !text-white !text-3xl transition-transform !duration-200 hover:!scale-110 active:!scale-95 cursor-pointer focus:!outline-none"
      >
        &times;
      </button>

      {/* Prev */}
      <button
        onClick={onPrev}
        className="absolute left-4 !bg-transparent !border-none !text-white !text-3xl transition-transform !duration-200 hover:!scale-110 active:!scale-95 cursor-pointer focus:!outline-none"
      >
        &#10094;
      </button>

      {/* Slider */}
      <div className="w-full max-w-3xl h-[60vh] overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Slide ${i + 1}`}
              className="w-full h-full object-contain flex-shrink-0"
            />
          ))}
        </div>
      </div>

      {/* Next */}
      <button
        onClick={onNext}
        className="absolute right-4 !bg-transparent !border-none !text-white !text-3xl transition-transform !duration-200 hover:!scale-110 active:!scale-95 cursor-pointer focus:outline-none"
      >
        &#10095;
      </button>

      {/* Thumbnails */}
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Thumb ${i + 1}`}
            className={`h-16 object-cover rounded cursor-pointer border-2 ${
              i === index ? "!border-white" : "border-transparent"
            } transition-opacity hover:opacity-70`}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
    </div>,
    document.body
  );
};
