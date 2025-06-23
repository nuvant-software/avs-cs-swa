// src/components/CarCard.tsx
import React, { useState, useEffect } from "react";
import { Lightbox } from "./Lightbox";

type Car = {
  id: string;
  brand: string;
  model: string;
  variant: string;
  fuel: string;
  mileage: number;
  transmission: string;
  price: number;
  year: number;
  engine_size: string;
  pk: number;
};

type Props = {
  car: Car;
  layout?: "grid" | "list";
};

const CarCard: React.FC<Props> = ({ car, layout = "grid" }) => {
  const [hoverZone, setHoverZone] = useState<number | null>(null);
  const [lastPreviewZone, setLastPreviewZone] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [allImages, setAllImages] = useState<string[]>([]);

  // 📸 Laden uit Azure Blob (fallback naar car_001)
  useEffect(() => {
    const baseFolder = "car_001"; // TODO: vervang door car.id zodra er per-auto mappen zijn
    const listBlobs = async () => {
      try {
        const res = await fetch(
          `https://avsapisa.blob.core.windows.net/carimages?restype=container&comp=list&prefix=${baseFolder}/`
        );
        if (!res.ok) throw new Error(res.statusText);
        const xmlText = await res.text();
        const doc = new DOMParser().parseFromString(xmlText, "application/xml");
        const blobs = Array.from(doc.getElementsByTagName("Blob"));
        const urls = blobs
          .map((b) => b.getElementsByTagName("Name")[0]?.textContent)
          .filter((n): n is string => !!n && n.toLowerCase().endsWith(".jpg"))
          .map(
            (name) =>
              `https://avsapisa.blob.core.windows.net/carimages/${name}`
          );
        setAllImages(urls);
      } catch (e) {
        console.error("Blob list error:", e);
      }
    };
    listBlobs();
  }, [car.id]);

  const totalPhotos = allImages.length;
  const prevSlide = () =>
    setCurrentSlide((s) => (s - 1 + totalPhotos) % totalPhotos);
  const nextSlide = () =>
    setCurrentSlide((s) => (s + 1) % totalPhotos);

  const renderImg = (src: string, idx: number) => (
    <img
      key={idx}
      src={src}
      alt={`${car.brand} ${car.model} foto ${idx + 1}`}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
      onClick={() => {
        setCurrentSlide(idx);
        setLightboxOpen(true);
      }}
    />
  );

  const getZoneContent = () => {
    const zone = hoverZone ?? lastPreviewZone;
    
    if (zone === 2) {
      if (totalPhotos === 3 && allImages[2]) {
        return renderImg(allImages[2], 2);
      }
      if (totalPhotos > 3) {
        const extra = totalPhotos - 2;
        return (
          <div
            className="w-full h-full !bg-[#1a1a1a] flex flex-col items-center justify-center cursor-pointer"
            onClick={() => {
              setCurrentSlide(2);
              setLightboxOpen(true);
            }}
          >
            <i className="icon-Group4 text-[3rem] !text-[#bfbfbf] mb-1" />
            <span className="text-sm !text-[#bfbfbf] font-medium">
              +{extra} EXTRA FOTO{extra !== 1 ? "'S" : ""}
            </span>
          </div>
        );
      }
      return null;
    }

    return allImages[zone]
      ? renderImg(allImages[zone], zone)
      : allImages[0]
      ? renderImg(allImages[0], 0)
      : null;
  };

  // ─── List Layout ─────────────────────────────────────
  if (layout === "list") {
    return (
      <>
        <div className="flex flex-col md:flex-row max-w-full transition-shadow duration-300 hover:shadow-lg">
          <div className="w-full md:w-1/3 h-60 md:h-auto overflow-hidden rounded-t-[6px] md:rounded-l-[6px] md:rounded-tr-none">
            {allImages[0] && (
              <img
                src={allImages[0]}
                alt={`${car.brand} ${car.model}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => {
                  setCurrentSlide(0);
                  setLightboxOpen(true);
                }}
              />
            )}
          </div>
          <div className="w-full md:w-2/3 p-5 flex flex-col justify-between !bg-white border border-t-0 md:border-l-0 border-gray-300 rounded-b-[6px] md:rounded-r-[6px] md:rounded-bl-none">
            <div>
              <h3 className="text-xl font-semibold !text-[#1C448E] mb-2">
                {car.brand} – {car.model}
              </h3>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm !text-[#6e6e6e] mb-4">
                <div className="flex items-center gap-2">
                  <i className="icon-Vector-13 text-[1.2rem]" />
                  <span>{car.year}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="icon-dashboard-2 text-[1.2rem]" />
                  <span>{car.mileage.toLocaleString()} km</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="icon-gearbox-1 text-[1.2rem]" />
                  <span>{car.transmission}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="icon-gasoline-pump-1 text-[1.2rem]" />
                  <span>{car.fuel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="icon-dashboard-2 text-[1.2rem]" />
                  <span>{car.pk} PK</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="icon-engine-1 text-[1.2rem]" />
                  <span>{car.engine_size}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-200">
              <p className="text-xl font-semibold !text-[#1C448E]">
                € {car.price.toLocaleString()}
              </p>
              <button className="inline-flex h-8 items-center justify-center rounded !bg-white px-4 py-1 font-semibold !text-[#1C448E] transition-opacity hover:opacity-90 group cursor-pointer">
                MEER WETEN
                <div className="relative ml-2 h-5 w-5 overflow-hidden">
                  <div className="absolute transition-all duration-300 group-hover:-translate-y-5 group-hover:translate-x-4">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                    >
                      <path
                        d="M3.64645 11.3536C3.45118 11.1583 3.45118 10.8417 3.64645 10.6465L10.2929 4L6 4C5.72386 4 5.5 3.77614 5.5 3.5C5.5 3.22386 5.72386 3 6 3L11.5 3C11.6326 3 11.7598 3.05268 11.8536 3.14645C11.9473 3.24022 12 3.36739 12 3.5L12 9C12 9.27614 11.7761 9.5 11.5 9.5C11.2239 9.5 11 9.27614 11 9V4.70711L4.35355 11.3536C4.15829 11.5488 3.84171 11.5488 3.64645 11.3536Z"
                        fill="currentColor"
                      />
                    </svg>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 -translate-x-4"
                    >
                      <path
                        d="M3.64645 11.3536C3.45118 11.1583 3.45118 10.8417 3.64645 10.6465L10.2929 4L6 4C5.72386 4 5.5 3.77614 5.5 3.5C5.5 3.22386 5.72386 3 6 3L11.5 3C11.6326 3 11.7598 3.05268 11.8536 3.14645C11.9473 3.24022 12 3.36739 12 3.5L12 9C12 9.27614 11.7761 9.5 11.5 9.5C11.2239 9.5 11 9.27614 11 9V4.70711L4.35355 11.3536C4.15829 11.5488 3.84171 11.5488 3.64645 11.3536Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <Lightbox
          images={allImages}
          index={currentSlide}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onPrev={prevSlide}
          onNext={nextSlide}
          onSelect={(i) => setCurrentSlide(i)}
        />
      </>
    );
  } // <-- deze haak sluit de if-block!

  // ─── Grid Layout (standaard) ─────────────────────────────────
  return (
    <>
      <div className="w-full max-w-[340px] mx-auto transition-shadow duration-300 hover:shadow-lg">
        <div
          className="relative w-full h-56 overflow-hidden group rounded-t-[6px]"
        >
          {getZoneContent()}
          <div className="absolute inset-0 flex">
            {[0, 1, 2].map((zone) => (
              <div
                key={zone}
                className="w-1/3 h-full"
                onMouseEnter={() => {
                  setHoverZone(zone);
                  setLastPreviewZone(zone);
                }}
                onClick={() => {
                  const idx = zone < 2 ? zone : 2;
                  setCurrentSlide(idx);
                  setLightboxOpen(true);
                }}
              />
            ))}
          </div>
          <div className="absolute bottom-0 left-0 w-full flex">
            {[0, 1, 2].map((zone, i) => (
              <div
                key={zone}
                className={`h-[3px] flex-1 transition-colors duration-300 ${
                  (hoverZone ?? lastPreviewZone) === zone ? "!bg-[#1C448E]" : "!bg-white/60"
                } ${i === 1 ? "mx-[6px]" : ""}`}
              />
            ))}
          </div>
        </div>

        <div className="p-5 !bg-white !border-gray-300 rounded-b-[6px] border-t-0 !border">
          <h3 className="text-xl font-bold !text-[#1C448E] mb-4 truncate">
            {car.brand} – {car.model}
          </h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm !text-[#6e6e6e] mb-4">
            <div className="flex items-center gap-2">
              <i className="icon-Vector-13 text-[1.2rem] !text-[#1C448E]" />
              <span>{car.year}</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="icon-dashboard-2 text-[1.2rem] !text-[#1C448E]" />
              <span>{car.mileage.toLocaleString()} km</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="icon-gearbox-1 text-[1.2rem] !text-[#1C448E]" />
              <span>{car.transmission}</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="icon-gasoline-pump-1 text-[1.2rem] !text-[#1C448E]" />
              <span>{car.fuel}</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="icon-dashboard-2 text-[1.2rem] !text-[#1C448E]" />
              <span>{car.pk} PK</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="icon-engine-1 text-[1.2rem] !text-[#1C448E]" />
              <span>{car.engine_size}</span>
            </div>
          </div>
          <div className="border-t !border-gray-300 my-4" />
          <div className="flex items-center justify-between">
            <p className="text-xl font-semibold">
              € {car.price.toLocaleString()}
            </p>
            <button className="!border-none inline-flex h-8 items-center justify-center rounded !bg-white px-4 py-1 font-bold !text-[#1C448E] transition-opacity hover:!opacity-90 group cursor-pointer">
              MEER WETEN
              <div className="relative ml-2 h-5 w-5 overflow-hidden">
                <div className="absolute transition-all duration-300 group-hover:-translate-y-5 group-hover:translate-x-4">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                  >
                    <path
                      d="M3.64645 11.3536C3.45118 11.1583 3.45118 10.8417 3.64645 10.6465L10.2929 4L6 4C5.72386 4 5.5 3.77614 5.5 3.5C5.5 3.22386 5.72386 3 6 3L11.5 3C11.6326 3 11.7598 3.05268 11.8536 3.14645C11.9473 3.24022 12 3.36739 12 3.5L12 9C12 9.27614 11.7761 9.5 11.5 9.5C11.2239 9.5 11 9.27614 11 9V4.70711L4.35355 11.3536C4.15829 11.5488 3.84171 11.5488 3.64645 11.3536Z"
                      fill="currentColor"
                    />
                  </svg>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 -translate-x-4"
                  >
                    <path
                      d="M3.64645 11.3536C3.45118 11.1583 3.45118 10.8417 3.64645 10.6465L10.2929 4L6 4C5.72386 4 5.5 3.77614 5.5 3.5C5.5 3.22386 5.72386 3 6 3L11.5 3C11.6326 3 11.7598 3.05268 11.8536 3.14645C11.9473 3.24022 12 3.36739 12 3.5L12 9C12 9.27614 11.7761 9.5 11.5 9.5C11.2239 9.5 11 9.27614 11 9V4.70711L4.35355 11.3536C4.15829 11.5488 3.84171 11.5488 3.64645 11.3536Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
      <Lightbox
        images={allImages}
        index={currentSlide}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrev={prevSlide}
        onNext={nextSlide}
        onSelect={(i) => setCurrentSlide(i)}
      />
    </>
  );
};

export default CarCard;
