import { useEffect, useState, useRef } from "react";
import toast from "../utils/toast";
import ReactMap, { Marker, Popup, NavigationControl, ScaleControl, GeolocateControl, MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2 } from "lucide-react";

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
  const [latestLocations, setLatestLocations] = useState<DeviceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceAliases, setDeviceAliases] = useState<Record<string, string>>({});
  const [aliasEdits, setAliasEdits] = useState<Record<string, string>>({});
  const [selectedLocation, setSelectedLocation] = useState<DeviceLocation | null>(null);
  const mapRef = useRef<MapRef>(null);

  const flyToLocation = (lat: number, lng: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, pitch: 0, duration: 2000 });
  };

  const fetchLocations = async () => {
    try {
      let allData: DeviceLocation[] = [];
      let hasMore = true;
      let offset = 0;
      const limit = 1000;

      // Recursive fetch to handle table > 1000 rows
      while (hasMore) {
        const res = await fetch(
          `${SUPABASE_URL}/${TABLE}?select=id,device_id,alias,latitude,longitude,timestamp&order=timestamp.asc&offset=${offset}&limit=${limit}`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              Range: `${offset}-${offset + limit - 1}`,
            },
          }
        );

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data: DeviceLocation[] = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          allData = [...allData, ...data];
          offset += limit;
        }

        if (!Array.isArray(data) || data.length < limit) {
          hasMore = false;
        }
      }

      if (allData.length === 0) {
        if (loading) setLoading(false);
        return;
      }

      const latestMap = new Map<string, DeviceLocation>();
      const aliasMap: Record<string, string> = {};

      allData.forEach((item: DeviceLocation) => {
        if (item.alias && item.alias.trim() !== "") {
          aliasMap[item.device_id] = item.alias;
        }

        const existing = latestMap.get(item.device_id);
        // Ensure we only keep the absolute newest record found in the database
        if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
          latestMap.set(item.device_id, item);
        }
      });

      setLatestLocations(Array.from(latestMap.values()));
      setDeviceAliases(aliasMap);
      if (loading) setLoading(false);

    } catch (err) {
      console.error("Error:", err);
      toast.error("Error fetching device locations.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 60000);
    return () => clearInterval(interval);
  }, []);

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
      toast.error("Failed to save alias.");
      return;
    }

    toast.success("Alias saved successfully!");
    setDeviceAliases({ ...deviceAliases, [deviceId]: newAlias });
    setAliasEdits({ ...aliasEdits, [deviceId]: "" });
    fetchLocations();
  };

  const isMobile = window.innerWidth < 460;
  const iconSize = isMobile ? 30 : 50;

  return (
    <div className="w-full h-screen p-6 bg-gray-50 flex flex-col">
      <div className="flex-1 w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 relative">
        
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-white/80 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center">
               <Loader2 className="animate-spin h-12 w-12 text-indigo-600 mb-3" />
               <p className="text-gray-600 font-medium">Updating map data...</p>
            </div>
          </div>
        )}

        <ReactMap
            ref={mapRef}
            initialViewState={{
                longitude: 101.686,
                latitude: 3.139,
                zoom: 11,
            }}
            style={{width: '100%', height: '100%', borderRadius: "1.5rem"}}
            mapStyle="https://tiles.openfreemap.org/styles/bright"
            mapLib={maplibregl}
        >
            <GeolocateControl position="top-left" />
            <NavigationControl position="top-left" />
            <ScaleControl position="bottom-right" />

            {latestLocations.map((loc) => (
                <Marker
                    key={loc.device_id}
                    longitude={loc.longitude}
                    latitude={loc.latitude}
                    anchor="bottom"
                    onClick={(e) => {
                        e.originalEvent.stopPropagation();
                        setSelectedLocation(loc);
                        flyToLocation(loc.latitude, loc.longitude);
                    }}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-indigo-500/30 rounded-full blur-md animate-pulse"></div>
                        <div className="absolute -inset-1 bg-indigo-400/50 rounded-full animate-ping opacity-75"></div>
                        <img 
                            src="https://www.freeiconspng.com/uploads/device-mobile-phone-icon--small--flat-iconset--paomedia-8.png" 
                            alt="Device"
                            style={{ width: iconSize, height: iconSize }}
                            className="relative z-10 transform transition-transform hover:scale-110 drop-shadow-2xl"
                        />
                    </div>
                     {deviceAliases[loc.device_id] && (
                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 px-2 py-0.5 rounded text-xs font-bold shadow-sm border border-gray-200 whitespace-nowrap">
                            {deviceAliases[loc.device_id]}
                        </div>
                     )}
                </Marker>
            ))}

            {selectedLocation && (
                <Popup
                    longitude={selectedLocation.longitude}
                    latitude={selectedLocation.latitude}
                    anchor="top"
                    onClose={() => setSelectedLocation(null)}
                    closeOnClick={false}
                    className="z-50"
                >
                    <div className="flex flex-col gap-2 p-1 min-w-[200px]">
                        <div className="text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">Device ID:</span> {selectedLocation.device_id}
                        </div>

                        <div className="text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">Alias:</span>{" "}
                            {deviceAliases[selectedLocation.device_id] ? (
                                <span className="text-indigo-600 font-medium">{deviceAliases[selectedLocation.device_id]}</span>
                            ) : (
                                <div className="flex gap-2 items-center mt-2">
                                    <input
                                        type="text"
                                        placeholder="Enter alias"
                                        value={aliasEdits[selectedLocation.device_id] || ""}
                                        onChange={(e) =>
                                            setAliasEdits({ ...aliasEdits, [selectedLocation.device_id]: e.target.value })
                                        }
                                        className="border border-gray-300 px-2 py-1 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                        onClick={() => saveAlias(selectedLocation.device_id)}
                                        className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-indigo-700 transition"
                                    >
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="text-xs text-gray-500 mt-1 pt-2 border-t border-gray-100">
                            {/* DAY/MONTH/YEAR format applied here */}
                            Last update: {new Date(selectedLocation.timestamp).toLocaleString("en-GB")}
                        </div>
                    </div>
                </Popup>
            )}
        </ReactMap>
      </div>
    </div>
  );
};

export default LiveDeviceMap;