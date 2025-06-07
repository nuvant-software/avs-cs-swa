import { useState } from 'react';

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      image: '/assets/hero/slide1.jpg',
      title: 'Welkom bij AutoVerkoop',
      description: 'Uw vertrouwde partner in autohandel'
    },
    {
      id: 2,
      image: '/assets/hero/slide2.jpg',
      title: 'Uitgebreide Collectie',
      description: 'Ontdek onze selectie van kwaliteitsvoertuigen'
    },
    {
      id: 3,
      image: '/assets/hero/slide3.jpg',
      title: 'Professionele Service',
      description: 'Expertise en betrouwbaarheid staan voorop'
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      {/* Debug info */}
      <div className="absolute top-0 left-0 bg-black/50 text-white p-2 z-50">
        Current slide: {currentSlide + 1}
        <br />
        Image path: {slides[currentSlide].image}
      </div>

      {/* Simple slider */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={slides[currentSlide].image}
          alt={slides[currentSlide].title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            console.error('Error loading image:', slides[currentSlide].image);
            e.currentTarget.style.border = '2px solid red';
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">{slides[currentSlide].title}</h1>
          <p className="text-xl md:text-2xl">{slides[currentSlide].description}</p>
        </div>
      </div>

      {/* Navigation buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full z-50"
      >
        ←
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full z-50"
      >
        →
      </button>
    </div>
  );
};

export default Home;    