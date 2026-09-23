import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

function RecenterOnChange({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
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

export function StoreLocationPicker({
  latitude,
  longitude,
  radiusKm,
  onChange,
  height = 320,
}: StoreLocationPickerProps) {
  const center = useMemo<[number, number]>(() => [latitude, longitude], [latitude, longitude]);
  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height, width: "100%", borderRadius: 12 }}
      scrollWheelZoom
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
            onChange({ latitude: ll.lat, longitude: ll.lng });
          },
        }}
      />
      <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: "#3b82f6", weight: 1, fillOpacity: 0.08 }} />
      <ClickHandler onChange={onChange} />
      <RecenterOnChange lat={latitude} lng={longitude} />
    </MapContainer>
  );
}
