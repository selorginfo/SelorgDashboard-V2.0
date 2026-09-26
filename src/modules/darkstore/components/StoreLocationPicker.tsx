import { useCallback, useEffect, useMemo, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Crosshair } from "lucide-react";
import "leaflet/dist/leaflet.css";
import styles from "./StoreLocationPicker.module.css";

// Leaflet's default icon URLs are broken under Vite bundling. Point them at the
// CDN copies so the marker actually renders.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface StoreLocationPickerProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
  onChange: (next: { latitude: number; longitude: number }) => void;
  height?: number;
}

function RecenterOnChange({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom ?? map.getZoom());
  }, [lat, lng, zoom, map]);
  return null;
}

function ClickHandler({ onChange }: { onChange: StoreLocationPickerProps["onChange"] }) {
  useMapEvents({
    click(e) {
      onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

function geoErrorMessage(code: number): string {
  if (code === 1) return "Location permission denied. Allow access in the browser and try again.";
  if (code === 2) return "Location unavailable. Check GPS / network and try again.";
  if (code === 3) return "Timed out getting your location. Try again.";
  return "Could not get your current location.";
}

export function StoreLocationPicker({
  latitude,
  longitude,
  radiusKm,
  onChange,
  height = 320,
}: StoreLocationPickerProps) {
  const center = useMemo<[number, number]>(() => [latitude, longitude], [latitude, longitude]);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [forceZoom, setForceZoom] = useState<number | undefined>(undefined);

  const useCurrentLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setForceZoom(16);
        setLocating(false);
      },
      (err) => {
        setGeoError(geoErrorMessage(err.code));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  }, [onChange]);

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.locateBtn}
          onClick={useCurrentLocation}
          disabled={locating}
          title="Center the pin on your device location"
        >
          <Crosshair size={14} aria-hidden />
          {locating ? "Locating…" : "Use current location"}
        </button>
        <span className={styles.hint}>Or click the map / drag the pin</span>
      </div>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height, width: "100%", borderRadius: 12 }}
        scrollWheelZoom
        className={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={center}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target as L.Marker;
              const ll = m.getLatLng();
              setForceZoom(undefined);
              onChange({ latitude: ll.lat, longitude: ll.lng });
            },
          }}
        />
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#3b82f6", weight: 1, fillOpacity: 0.08 }}
        />
        <ClickHandler
          onChange={(next) => {
            setForceZoom(undefined);
            onChange(next);
          }}
        />
        <RecenterOnChange lat={latitude} lng={longitude} zoom={forceZoom} />
      </MapContainer>
      {geoError ? <p className={styles.error}>{geoError}</p> : null}
    </div>
  );
}
