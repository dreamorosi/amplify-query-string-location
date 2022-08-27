import React, { useEffect, useRef, useState } from "react";
import { MapView } from "@aws-amplify/ui-react";
import {
  MapRef,
  ViewStateChangeEvent,
  MapLayerMouseEvent,
  Marker,
  Source,
  Layer,
  NavigationControl,
  GeolocateControl,
} from "react-map-gl";
import { useHash } from "./useHash.hook";
import { useDebouncedMarkers } from "./useDebouncedMarkers.hook";
import {
  deriveViewStateFromHash,
  centerBbox,
  getRoutePath,
  RoutePathResult,
  layerStyleDriving,
} from "./App.helpers";
import awsexports from "./aws-exports.cjs";

const defaultViewState = {
  longitude: -123.1187,
  latitude: 49.2819,
  zoom: 11,
};

type AppProps = {
  children?: React.ReactNode;
};

const App: React.FC<AppProps> = () => {
  const hashRef = useRef("");
  const mapRef = useRef<MapRef>(null);
  const [hash, setHash] = useHash();
  const [markers, setMarkers] = useDebouncedMarkers();
  const [routePath, setRoutePath] = useState<RoutePathResult>();

  // This effect runs when the hash changes, we are only interested in
  // when the hash is empty, which corresponds to a first load of the page
  // without any coords nor route in the url, in that case we just update the
  // hash using the default position (see initialViewState below for actual map position)
  useEffect(() => {
    if (hash === "") {
      const { zoom, latitude, longitude } = defaultViewState;
      setHash(`#map=${zoom}/${latitude}/${longitude}/0/0`);
      hashRef.current = `#map=${zoom}/${latitude}/${longitude}/0/0`;
    }
  }, [hash]);

  // This function is fired every time the map stops moving (this includes zoom,
  // bearing, and pitch changes). The function gets the snapshot of the map view
  // at the end of the movement & updates the page url accordingly
  const handleMapMoveEnd = (e: ViewStateChangeEvent) => {
    const { zoom, latitude, longitude, bearing, pitch } = e.viewState;
    const originalHash = window.location.hash;
    const [, route] = originalHash.split("&");
    let newHash = `#map=${zoom}/${latitude}/${longitude}/${bearing}/${pitch}`;
    if (route) newHash = `${newHash}&${route}`;
    setHash(newHash);
    hashRef.current = newHash;
  };

  // This function is called every time** the map is clicked and it adds a new marker
  //
  // ** While the function itself is called for every click, the markers are added
  // using debouncing, this is to decrease the risk of adding a new marker before
  // the route has been calculated. This solution is not perfect and the CalculateRoute
  // request should instead be aborted properly, but this is a sample after all
  const handleMapClick = (e: MapLayerMouseEvent) => {
    setMarkers([...markers, e.lngLat]);
  };

  useEffect(() => {
    const calculateRoute = async () => {
      try {
        const res = await getRoutePath(
          awsexports.geo.amazon_location_service.routeCalculator,
          awsexports.geo.amazon_location_service.region,
          markers
        );

        // Update the URL with the base64-encoded route, the new hash
        // will be #map=Zoom/Lat/Lng/Pitch/Bearing&route= ... <- route.base64
        const originalHash = window.location.hash;
        const [map] = originalHash.split("&");
        const newHash = `${map}&route=${res.base64}`;
        setHash(newHash);
        hashRef.current = newHash;

        // If there's a route with an actual bounding box, center the map on it
        centerBbox(mapRef.current, res.bbox);

        setRoutePath(res);
      } catch (err) {
        console.error(err);
        throw err;
      }
    };

    if (markers.length > 1) {
      calculateRoute();
    }
  }, [markers]);

  return (
    <>
      <MapView
        // This instructs the MapView component to use the coords in the hash (if any)
        // or use the defaultViewState
        initialViewState={
          hash ? deriveViewStateFromHash(hash) : defaultViewState
        }
        ref={mapRef}
        style={{
          width: "100vw",
          height: "100vh",
        }}
        onMoveEnd={handleMapMoveEnd}
        onClick={handleMapClick}
      >
        <NavigationControl />
        <GeolocateControl />
        {/* // If there're markers, show them on the map */}
        {markers.map((marker) => (
          <Marker
            key={marker.toString()}
            latitude={marker.lat}
            longitude={marker.lng}
          />
        ))}
        {/* If there's a routePath, show it on the map */}
        {routePath ? (
          <Source
            key="source"
            id="my-data"
            type="geojson"
            // This type ignore applies to the value of `data`, the reason is that
            // we are using two libraries @turf & react-map-gl that have equivalent
            // but different types for a feature collection. With more time we could
            // find the right types, but for now i'm just putting an ignore to save
            // time.
            // @ts-ignore
            data={routePath.route}
          >
            <Layer {...layerStyleDriving} />
          </Source>
        ) : null}
      </MapView>
    </>
  );
};

export default App;
