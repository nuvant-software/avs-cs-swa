import React from 'react';

const Home = () => (
  <>
    {/* HERO */}
    <section
      className="
        !relative
        !w-screen
        !h-[calc(100vh-40px)]
        !bg-[url('/assets/hero/slide1.jpg')]
        !bg-cover
        !bg-center
        !flex
        !items-center
        !justify-center
      "
    >
      {/* donkere overlay */}
      <div className="!absolute !inset-0 !bg-black/60" />

      <div className="!relative !text-center !text-white !px-4">
        <h1 className="!text-5xl !md:text-7xl !font-bold mb-4">
          Welkom bij AVS Autoverkoop
        </h1>
        <p className="!text-lg !md:text-2xl mb-6">
          Kwaliteit en betrouwbaarheid sinds 2004
        </p>
        <button className="!bg-[#27408B] !text-white !px-6 !py-3 !rounded-lg !text-xl hover:!bg-[#0A1833] !transition !duration-300">
          Bekijk Onze Auto's
        </button>
      </div>
    </section>

    {/* OVER ONS */}
    <section className="!bg-gray-50 !py-16">
      <div className="!w-3/4 !mx-auto !text-center">
        <h2 className="!text-4xl !font-bold mb-4">Over Ons</h2>
        <p className="!text-lg !text-gray-700">
          AVS Autoverkoop is al meer dan 20 jaar dé specialist in kwalitatieve tweedehands auto's.
        </p>
      </div>
    </section>
  </>
);

export default Home;
