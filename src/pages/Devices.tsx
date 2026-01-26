import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "../utils/toast";
import { ClockIcon, ComputerDesktopIcon, MapPinIcon, WifiIcon, XCircleIcon } from "@heroicons/react/24/solid";

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

interface DeviceStatus {
  device_id: string;
  alias?: string | null;
  latestTimestamp: string;
  status: "Online" | "Offline";
  latitude: number;
  longitude: number;
}

const DeviceStatusCard: React.FC<{ device: DeviceStatus }> = ({ device }) => {
  const isOnline = device.status === "Online";
  const statusColor = isOnline ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50";
  const StatusIcon = isOnline ? WifiIcon : XCircleIcon;
  const formattedTimestamp = new Date(device.latestTimestamp).toLocaleString('en-GB');

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition duration-300 border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-semibold ${statusColor}`}>
          <StatusIcon className="w-5 h-5" />
          <span>{device.status}</span>
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-800 truncate mb-1">
        {device.alias || `Device ${device.device_id.substring(0, 8)}`}
      </h3>
      <p className="text-sm text-gray-500 flex items-center mb-4">
        <ComputerDesktopIcon className="w-4 h-4 mr-1" />
        ID: <span className="font-mono ml-1 text-gray-600">{device.device_id}</span>
      </p>

      <div className="space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <ClockIcon className="w-4 h-4 mr-2 text-indigo-500" />
          <span className="font-medium">Last Ping:</span>
          <span className="ml-2">{formattedTimestamp}</span>
        </div>

        <div className="flex gap-4">
          <a
            href={`https://www.google.com/maps?q=${device.latitude},${device.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-blue-500 hover:text-blue-700 transition duration-150"
          >
            <MapPinIcon className="w-4 h-4 mr-2" />
            <span className="underline">View Location</span>
          </a>

          <Link
            to={`/device-history/${device.device_id}`}
            className="flex items-center text-sm text-indigo-500 hover:text-indigo-700 transition duration-150"
          >
            <ClockIcon className="w-4 h-4 mr-2" />
            <span className="underline">View History</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

const DeviceStatusPage = () => {
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeviceStatuses = async () => {
    setLoading(true);
    try {
      let allData: DeviceLocation[] = [];
      let hasMore = true;
      let offset = 0;
      const limit = 1000;

      while (hasMore) {
        const res = await fetch(
          `${SUPABASE_URL}/${TABLE}?select=device_id,alias,latitude,longitude,timestamp&order=timestamp.asc&offset=${offset}&limit=${limit}`,
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
        
        if (data.length > 0) {
          allData = [...allData, ...data];
          offset += limit;
        }
        if (data.length < limit) hasMore = false;
      }

      if (allData.length === 0) {
        setDeviceStatuses([]);
        setLoading(false);
        return;
      }

      const latestMap = new Map<string, DeviceLocation>();
      const aliasMap = new Map<string, string>(); 

      allData.forEach((d) => {
        if (d.alias) aliasMap.set(d.device_id, d.alias);
        const existing = latestMap.get(d.device_id);
        if (!existing || new Date(d.timestamp) > new Date(existing.timestamp)) {
          latestMap.set(d.device_id, d);
        }
      });

      const statuses: DeviceStatus[] = Array.from(latestMap.values()).map((d) => {
        const latestTime = new Date(d.timestamp);
        const now = new Date();
        const diffMinutes = (now.getTime() - latestTime.getTime()) / 1000 / 60;
        const aliasToUse = d.alias ?? aliasMap.get(d.device_id);

        return {
          device_id: d.device_id,
          alias: aliasToUse,
          latestTimestamp: d.timestamp,
          status: diffMinutes <= 15 ? "Online" : "Offline",
          latitude: d.latitude,
          longitude: d.longitude,
        };
      });

      setDeviceStatuses(statuses);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error fetching device statuses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceStatuses();
    const interval = setInterval(fetchDeviceStatuses, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- SORTED BY LAST UPDATED (Newest First) ---
  const sortedStatuses = [...deviceStatuses].sort((a, b) => {
    return new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime();
  });

  const onlineCount = deviceStatuses.filter(d => d.status === "Online").length;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center">
          <ComputerDesktopIcon className="w-8 h-8 mr-3 text-indigo-600" />
          Device Tracking Dashboard
        </h1>
        <p className="text-gray-500 mt-2">Latest activity shown first.</p>
        <div className="mt-4 p-4 rounded-lg bg-white shadow flex flex-col md:flex-row justify-between items-center text-lg font-semibold gap-4">
          <span className="text-gray-700">Total Devices: <span className="text-indigo-600">{deviceStatuses.length}</span></span>
          <span className="text-green-600">Online: {onlineCount}</span>
          <span className="text-red-600">Offline: {deviceStatuses.length - onlineCount}</span>
        </div>
      </header>

      {loading && deviceStatuses.length === 0 ? (
        <div className="p-10 text-center text-indigo-500 font-medium">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-t-4 border-indigo-600 border-opacity-25 rounded-full mb-3"></div>
          <p>Syncing tracking data...</p>
        </div>
      ) : sortedStatuses.length === 0 ? (
        <div className="p-10 text-center text-gray-500 bg-white rounded-lg shadow">
          <p className="text-xl font-medium">No device locations found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedStatuses.map((device) => (
            <DeviceStatusCard key={device.device_id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DeviceStatusPage;