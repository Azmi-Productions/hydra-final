import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- Supabase REST API ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = "rest/v1/device_tracking_sanitized";

interface DeviceLocation {
  id: number;
  device_id: string;
  alias?: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
}

const LiveDeviceMap = () => {
  const [allLocations, setAllLocations] = useState<DeviceLocation[]>([]);
  const [latestLocations, setLatestLocations] = useState<DeviceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceAliases, setDeviceAliases] = useState<Record<string, string>>({});
  const [aliasEdits, setAliasEdits] = useState<Record<string, string>>({});

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${SUPABASE_URL}/${TABLE}?select=id,device_id,alias,latitude,longitude,timestamp&order=timestamp.asc`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error("Supabase returned an error:", data);
        return;
      }

      setAllLocations(data); // full dataset for trails

      // Build latest location per device
      const latestMap = new Map<string, DeviceLocation>();
      const aliasMap: Record<string, string> = {};

      data.forEach((item: DeviceLocation) => {
        // store alias if exists
        if (item.alias && item.alias.trim() !== "") {
          aliasMap[item.device_id] = item.alias;
        }

        const existing = latestMap.get(item.device_id);
        if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
          latestMap.set(item.device_id, item);
        }
      });

      setLatestLocations(Array.from(latestMap.values()));
      setDeviceAliases(aliasMap);
    } catch (err) {
      console.error("Error fetching device locations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Save alias for a device
  const saveAlias = async (deviceId: string) => {
    const newAlias = aliasEdits[deviceId];
    if (!newAlias || newAlias.trim() === "") return;

    const res = await fetch(`${SUPABASE_URL}/${TABLE}?device_id=eq.${deviceId}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ alias: newAlias }),
    });

    if (!res.ok) {
      console.error("Failed to save alias");
      return;
    }

    setDeviceAliases({ ...deviceAliases, [deviceId]: newAlias });
    setAliasEdits({ ...aliasEdits, [deviceId]: "" });
  };

  // Build trails per device using allLocations
  const trails: Record<string, [number, number][]> = {};
  allLocations.forEach((loc) => {
    if (!trails[loc.device_id]) trails[loc.device_id] = [];
    trails[loc.device_id].push([loc.latitude, loc.longitude]);
  });
// Responsive icon size
const isMobile = window.innerWidth < 460; // mobile check

// MUST be typed as tuple
const iconSize: [number, number] = isMobile ? [30, 30] : [50, 50];
const iconAnchor: [number, number] = isMobile ? [12, 20] : [20, 35];


  return (
    <div className="w-full h-screen">
        
      {loading && <p className="text-center mt-4">Loading device locations...</p>}

      <MapContainer
        center={[3.139, 101.686]} // Kuala Lumpur default
        zoom={10}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Draw trails */}
        {Object.entries(trails).map(([deviceId, coords]) => (
          <Polyline key={`trail-${deviceId}`} positions={coords} color="blue" weight={3} />
        ))}

        {/* Latest location markers */}
        {latestLocations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={L.icon({
              iconUrl:
                "https://www.freeiconspng.com/uploads/device-mobile-phone-icon--small--flat-iconset--paomedia-8.png",
              iconSize: iconSize,
              iconAnchor: iconAnchor,
            })}
          >
            <Popup>
              <div className="flex flex-col gap-2 w-60">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">Device ID:</span> {loc.device_id}
                </div>

                <div className="text-sm text-gray-700">
                  <span className="font-semibold">Alias:</span>{" "}
                  {deviceAliases[loc.device_id] ? (
                    <span className="text-blue-600">{deviceAliases[loc.device_id]}</span>
                  ) : (
                    <div className="flex gap-1 items-center mt-1">
                      <input
                        type="text"
                        placeholder="Enter alias"
                        value={aliasEdits[loc.device_id] || ""}
                        onChange={(e) =>
                          setAliasEdits({ ...aliasEdits, [loc.device_id]: e.target.value })
                        }
                        className="border border-gray-300 px-2 py-1 rounded flex-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => saveAlias(loc.device_id)}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700 transition"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-700">
                  <span className="font-semibold">Timestamp:</span>{" "}
                  {new Date(loc.timestamp).toLocaleString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveDeviceMap;
