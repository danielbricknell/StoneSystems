"use client";

import { useEffect, useRef, useState } from "react";

type Prediction = { placeId: string; description: string };

export function AddressField({
  id,
  name,
  label,
  defaultValue = "",
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextLookup = useRef(false);

  useEffect(() => {
    if (skipNextLookup.current) {
      skipNextLookup.current = false;
      return;
    }

    if (value.trim().length < 3) {
      setPredictions([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(value)}`,
        );
        const data = await res.json();
        setPredictions(data.predictions ?? []);
        setOpen(true);
      } catch {
        setPredictions([]);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="field address-field" ref={containerRef}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        autoComplete="off"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => predictions.length > 0 && setOpen(true)}
      />
      {open && predictions.length > 0 && (
        <div className="address-suggestions">
          <ul>
            {predictions.map((prediction) => (
              <li key={prediction.placeId}>
                <button
                  type="button"
                  onClick={() => {
                    skipNextLookup.current = true;
                    setValue(prediction.description);
                    setPredictions([]);
                    setOpen(false);
                  }}
                >
                  {prediction.description}
                </button>
              </li>
            ))}
          </ul>
          <div className="address-suggestions-footer">Powered by Google</div>
        </div>
      )}
    </div>
  );
}
