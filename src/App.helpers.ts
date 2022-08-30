import {
  LocationClient,
  CalculateRouteCommand,
  CalculateRouteCommandOutput,
  CalculateRouteCommandInput,
} from "@aws-sdk/client-location";
import { ViewState, LngLat, LayerProps, MapRef } from "react-map-gl";
import { featureCollection, lineString } from "@turf/helpers";
import combine from "@turf/combine";
import bbox from "@turf/bbox";
import { Position, FeatureCollection, Properties, BBox } from "@turf/helpers";
import { Auth } from "@aws-amplify/auth";
import { ICredentials } from "@aws-amplify/core";
import { fromBase64, toBase64 } from "@aws-sdk/util-base64-browser";

const layerStyleDriving: LayerProps = {
  id: "linesLayer",
  type: "line",
  layout: {
    "line-cap": "round",
  },
  paint: {
    "line-color": "#5B21B6",
    "line-width": 5,
  },
};

const deriveViewStateFromHash = (hash: string): Partial<ViewState> => {
  const [map] = hash.split("&");
  const features = map.replace("#map=", "").split("/");
  return {
    zoom: features[0].includes(".")
      ? parseFloat(features[0])
      : parseInt(features[0]),
    latitude: features[1].includes(".")
      ? parseFloat(features[1])
      : parseInt(features[1]),
    longitude: features[2].includes(".")
      ? parseFloat(features[2])
      : parseInt(features[2]),
  };
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

class LngLatAlt {
  lng;
  lat;

  constructor(lng: string, lat: string) {
    this.lng = Number(lng);
    this.lat = Number(lat);
    if (this.lat > 90 || this.lat < -90) {
      throw new Error(
        "Invalid LngLat latitude value: must be between -90 and 90"
      );
    }
  }

  wrap() {
    throw new Error("Not Implemented");
  }

  toArray() {
    return [this.lng, this.lat];
  }

  toString() {
    return `LngLat(${this.lng}, ${this.lat})`;
  }

  distanceTo(lngLat: LngLat) {
    throw new Error("Not Implemented");
  }

  toBounds(radius = 0) {
    throw new Error("Not Implemented");
  }

  static convert(input: any) {
    throw new Error("Not Implemented");
  }
}

const deriveMarkersFromHash = (hash: string): LngLat[] => {
  const [, route] = hash.split("&");
  if (!route) return [];

  const base64EncodedMarkersString = route.replace("route=", "");
  const encodedMarkersString = fromBase64(base64EncodedMarkersString);
  const decodedMarkersString = textDecoder.decode(encodedMarkersString);
  const markersString = decodedMarkersString.split("$");

  // This command decodes a base64 encoded string of markers, seaparated by a `$` symbol
  // for instance, two markers would be:
  // -122.97605616912185,49.22455679584917$-123.04746730193418,49.25055978986748
  return markersString.map((markerString) => {
    const [lng, lat] = markerString.split(",");
    return new LngLatAlt(lng, lat);
  }) as LngLat[];
};

let cachedCredentials: ICredentials;
const getCredentials = async () => {
  if (!cachedCredentials || cachedCredentials.expiration === undefined) {
    cachedCredentials = await Auth.currentCredentials();
    return cachedCredentials;
  }
  // If credentials are expired or about to expire, refresh them
  if ((cachedCredentials.expiration.getTime() - Date.now()) / 1000 < 60) {
    cachedCredentials = await Auth.currentCredentials();
    return cachedCredentials;
  }

  return cachedCredentials;
};

let client: LocationClient;
const getLocationClient = async (region: string) => {
  const credentials = await getCredentials();
  if (!client || credentials.accessKeyId !== cachedCredentials.accessKeyId) {
    client = new LocationClient({
      credentials,
      region,
    });

    return client;
  }

  return client;
};

export type RoutePath = FeatureCollection<
  {
    type: "MultiLineString";
    coordinates: number[][] | number[][][] | number[][][][];
  },
  {
    collectedProperties: Properties[];
  }
>;

export type RoutePathResult = {
  distance: number;
  duration: number;
  route: RoutePath;
  bbox: BBox;
  base64: string;
};

// This function takes a series of points (LngLat) and calculates
// the route between each one of them respecting the order supplied.
// It returns the route path, its bounding box, a base64-encoded
// representation of the points sequence, total distance, and total
// duration.
const getRoutePath = async (
  calculatorName: string,
  region: string,
  markers: LngLat[]
): Promise<RoutePathResult> => {
  const client = await getLocationClient(region);

  const commandInput: Partial<CalculateRouteCommandInput> = {
    CalculatorName: calculatorName,
    TravelMode: "Car",
    IncludeLegGeometry: true,
  };

  const departureMarker = markers[0];
  commandInput.DeparturePosition = [departureMarker.lng, departureMarker.lat];
  const destinationMarker = markers[markers.length - 1];
  commandInput.DestinationPosition = [
    destinationMarker.lng,
    destinationMarker.lat,
  ];

  if (markers.length > 2) {
    const waypoints = markers.slice(1, -1);
    commandInput.WaypointPositions = waypoints.map(({ lng, lat }) => [
      lng,
      lat,
    ]);
    console.log(waypoints);
  }

  const result = await client.send(
    new CalculateRouteCommand(commandInput as CalculateRouteCommandInput)
  );

  // This command generates an encoded string of each markers, seaparated by a `$` symbol
  // for instance, two markers would be:
  // -122.97605616912185,49.22455679584917$-123.04746730193418,49.25055978986748
  const encodedMarkersString = textEncoder.encode(
    markers.map((marker) => `${marker.lng},${marker.lat}`).join("$")
  );

  if (!result.Legs)
    throw new Error("Unable to load intinerary geometry for legs");

  const routeFeatureCollection = featureCollection([
    ...result.Legs.map((leg) => {
      return lineString(leg.Geometry?.LineString as Position[]);
    }),
  ]);

  const combineFeauterCollection = combine(routeFeatureCollection);
  console.log(result.Legs);

  return {
    distance: result.Summary?.Distance || 0,
    duration: result.Summary?.DurationSeconds || 0,
    route: combineFeauterCollection as RoutePath,
    bbox: bbox(combineFeauterCollection),
    base64: toBase64(encodedMarkersString),
  };
};

// This function takes a map reference and a bounding box,
// and centers the viewport of the map to the provided bounding
// box with some padding on each side
const centerBbox = (map: MapRef | null, bbox: BBox) => {
  if (bbox && bbox.every((x: number) => x !== Math.abs(Infinity))) {
    map?.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      {
        padding: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
        speed: 0.8,
        linear: false,
      }
    );
  }
};

export {
  deriveViewStateFromHash,
  deriveMarkersFromHash,
  getRoutePath,
  layerStyleDriving,
  centerBbox,
};
