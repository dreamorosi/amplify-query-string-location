import { useState } from "react";
import { useDebounce } from "use-debounce";
import { LngLat } from "react-map-gl";
import { deriveMarkersFromHash } from "./App.helpers";

export const useDebouncedMarkers = () => {
  const [markers, setMarkers] = useState<LngLat[]>(() =>
    window.location.hash ? deriveMarkersFromHash(window.location.hash) : []
  );
  const [debouncedMarkers] = useDebounce(markers, 500);

  return [debouncedMarkers, setMarkers] as const;
};
