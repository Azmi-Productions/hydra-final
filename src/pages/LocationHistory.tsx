import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMap, { Source, Layer, Marker, NavigationControl, ScaleControl, MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowLeftIcon, CalendarIcon, MapPinIcon } from "@heroicons/react/24/solid";
import toast from "../utils/toast";
import dayjs from "dayjs";

// --- Supabase Config ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = "rest/v1/device_tracking_sanitized";

interface DeviceLocation {
  id: number;
  device_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

const LocationHistoryPage = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);

  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [locations, setLocations] = useState<DeviceLocation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      // Create start and end ISO strings for the selected date (UTC is standard for DBs usually, but let's assume loose matching or local for now, 
      // typically users want to see "their day". We'll filter by >= start of day AND < start of next day)
      const startOfDay = dayjs(date).startOf("day").toISOString();
      const endOfDay = dayjs(date).endOf("day").toISOString();

      const res = await fetch(
        `${SUPABASE_URL}/${TABLE}?device_id=eq.${deviceId}&timestamp=gte.${startOfDay}&timestamp=lte.${endOfDay}&select=id,device_id,latitude,longitude,timestamp&order=timestamp.asc`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch history");

      const data: DeviceLocation[] = await res.json();
      setLocations(data);
      
      // If we have points, fit bounds
      if (data.length > 0 && mapRef.current) {
        // Simple bounds calculation
        const longitudes = data.map(d => d.longitude);
        const latitudes = data.map(d => d.latitude);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        
        // Fit bounds with some padding
        mapRef.current.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 50, duration: 1000 }
        );
      }

    } catch (err: any) {
      console.error(err);
      toast.error("Error loading location history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [deviceId, date]);

  // GeoJSON for the line path
  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: locations.map(l => [l.longitude, l.latitude]),
        },
        properties: {},
      },
    ],
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm z-10 p-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Location History</h1>
            <p className="text-sm text-gray-500">Device ID: <span className="font-mono">{deviceId}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button 
            onClick={fetchHistory} 
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Map Content */}
      <div className="flex-1 relative">
        <ReactMap
          ref={mapRef}
          initialViewState={{
            longitude: 101.686,
            latitude: 3.139,
            zoom: 11,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="https://tiles.openfreemap.org/styles/bright"
          mapLib={maplibregl}
        >
          <NavigationControl position="bottom-right" />
          <ScaleControl />

          {/* Path Line Layer */}
          <Source id="route" type="geojson" data={geojson}>
            <Layer
              id="route-line"
              type="line"
              layout={{
                "line-join": "round",
                "line-cap": "round",
              }}
              paint={{
                "line-color": "#4F46E5", // Indigo-600
                "line-width": 4,
                "line-opacity": 0.8
              }}
            />
          </Source>

          {/* Markers for Start and End (if data exists) */}
          {locations.length > 0 && (
            <>
              {/* Start Marker */}
              <Marker 
                longitude={locations[0].longitude} 
                latitude={locations[0].latitude}
                anchor="bottom"
              >
                <div className="flex flex-col items-center">
                  <div className="px-2 py-0.5 bg-green-600 text-white text-xs rounded shadow-md mb-1">Start</div>
                  <MapPinIcon className="w-6 h-6 text-green-600 drop-shadow-md" />
                </div>
              </Marker>

              {/* End Marker */}
              <Marker 
                longitude={locations[locations.length - 1].longitude} 
                latitude={locations[locations.length - 1].latitude}
                anchor="bottom"
                >
                <div className="flex flex-col items-center">
                  <div className="px-2 py-0.5 bg-red-600 text-white text-xs rounded shadow-md mb-1">End</div>
                  <MapPinIcon className="w-6 h-6 text-red-600 drop-shadow-md" />
                </div>
              </Marker>
            </>
          )}
        </ReactMap>

        {/* Floating Info Panel */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100 max-w-xs">
           <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Daily Summary</h3>
           <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Points Recorded:</span>
                <span className="font-bold text-gray-900">{locations.length}</span>
              </div>
              {locations.length > 0 && (
                 <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">First Ping:</span>
                    <span className="font-mono text-xs">{dayjs(locations[0].timestamp).format("HH:mm:ss")}</span>
                  </div>
                   <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Ping:</span>
                    <span className="font-mono text-xs">{dayjs(locations[locations.length - 1].timestamp).format("HH:mm:ss")}</span>
                  </div>
                 </>
              )}
              {locations.length === 0 && !loading && (
                  <p className="text-xs text-red-500 italic">No data available for this date.</p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default LocationHistoryPage;
