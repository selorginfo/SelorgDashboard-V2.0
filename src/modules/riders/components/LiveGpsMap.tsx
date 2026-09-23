import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LiveRiderPosition } from "@/modules/riders/hooks/useLiveRiderPositions";

// Fix Vite/webpack asset resolution for default Leaflet marker icons.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [13.0827, 80.2707]; // Chennai

interface LiveGpsMapProps {
  positions: LiveRiderPosition[];
  height?: number;
  onSelect?: (riderId: string) => void;
}

export function LiveGpsMap({ positions, height = 480, onSelect }: LiveGpsMapProps) {
  const center = useMemo<[number, number]>(() => {
    if (positions.length === 0) return DEFAULT_CENTER;
    const avgLat = positions.reduce((s, p) => s + p.lat, 0) / positions.length;
    const avgLng = positions.reduce((s, p) => s + p.lng, 0) / positions.length;
    return [avgLat, avgLng];
  }, [positions]);

  return (
    <MapContainer center={center} zoom={12} style={{ height, width: "100%", borderRadius: 12 }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.map((p) => (
        <Marker
          key={p.riderId}
          position={[p.lat, p.lng]}
          eventHandlers={{ click: () => onSelect?.(p.riderId) }}
        >
          <Popup>
            <div style={{ fontSize: 12 }}>
              <div style={{ fontWeight: 600 }}>Rider: {p.riderId}</div>
              <div>Lat: {p.lat.toFixed(5)}</div>
              <div>Lng: {p.lng.toFixed(5)}</div>
              <div style={{ color: "#6b7280" }}>Updated {Math.max(0, Math.round((Date.now() - p.ts) / 1000))}s ago</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
