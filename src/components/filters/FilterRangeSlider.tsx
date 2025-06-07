import React, { useState, useEffect } from 'react'
import type { KeyboardEvent } from 'react';
// @ts-ignore: rc-slider has no type declarations
import Slider from 'rc-slider';
import "rc-slider/assets/index.css";

type Props = {
  /** Label shown above the slider */
  label: string;
  /** Current range value */
  value: [number, number];
  /** Minimum allowed value */
  min: number;
  /** Maximum allowed value */
  max: number;
  /** Called when the range is updated */
  onChange: (value: [number, number]) => void;
  /** Optional placeholder for the lower input */
  placeholderMin?: string;
  /** Optional placeholder for the upper input */
  placeholderMax?: string;
};

const FilterRangeSlider: React.FC<Props> = ({
  label,
  value,
  min,
  max,
  onChange,
  placeholderMin,
  placeholderMax,
}) => {
  const [initialized, setInitialized] = useState<boolean>(false);
  const [inputMin, setInputMin] = useState<string>("");
  const [inputMax, setInputMax] = useState<string>("");

  // Sync inputs when external value changes
  useEffect(() => {
    if (!initialized) {
      setInputMin(min.toString());
      setInputMax(max.toString());
      setInitialized(true);
    } else {
      setInputMin(value[0].toString());
      setInputMax(value[1].toString());
    }
  }, [value, initialized, min, max]);

  const commitValues = () => {
    let newMin = parseInt(inputMin, 10);
    let newMax = parseInt(inputMax, 10);

    if (isNaN(newMin)) newMin = min;
    if (isNaN(newMax)) newMax = max;

    newMin = Math.max(min, Math.min(newMin, max));
    newMax = Math.max(min, Math.min(newMax, max));

    if (newMax < newMin) newMax = newMin;

    setInputMin(newMin.toString());
    setInputMax(newMax.toString());
    onChange([newMin, newMax]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitValues();
      (e.target as HTMLInputElement).blur();
    }
  };

  const sliderValue: [number, number] = initialized ? value : [min, max];

  return (
    <div className="!mb-6">
      <label className="!block !mb-2 !font-medium">{label}</label>
      <Slider
        range
        min={min}
        max={max}
        value={sliderValue}
        onChange={(val: number | number[]) => onChange(val as [number, number])}
        allowCross={false}
        trackStyle={[{ backgroundColor: "#1C448E" }]}
        handleStyle={[
          { borderColor: "#1C448E", backgroundColor: "#fff", opacity: 1 },
          { borderColor: "#1C448E", backgroundColor: "#fff", opacity: 1 },
        ]}
      />
      <div className="!flex !justify-between !items-center !text-sm !mt-2">
        <input
          type="number"
          placeholder={placeholderMin || `van ${label.toLowerCase()}`}
          className="no-spinner !w-1/2 !p-1 !border !border-gray-300 !rounded !mr-2 !text-sm"
          value={inputMin}
          min={min}
          max={max}
          onChange={(e) => setInputMin(e.target.value)}
          onBlur={commitValues}
          onKeyDown={handleKeyDown}
        />
        <input
          type="number"
          placeholder={placeholderMax || `tot ${label.toLowerCase()}`}
          className="no-spinner !w-1/2 !p-1 !border !border-gray-300 !rounded !text-sm"
          value={inputMax}
          min={min}
          max={max}
          onChange={(e) => setInputMax(e.target.value)}
          onBlur={commitValues}
          onKeyDown={handleKeyDown}
        />
      </div>
      <style>
        {`
          .no-spinner::-webkit-outer-spin-button,
          .no-spinner::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .no-spinner {
            -moz-appearance: textfield;
          }
        `}
      </style>
    </div>
  );
};

export default FilterRangeSlider;
