import { useState, ChangeEvent, useEffect } from "react";
import toast from "../utils/toast";
import { MapPin, Calendar, Briefcase, Camera, X, Loader2, ArrowLeft } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import DimensionInput, { Dimensions } from '../components/DimensionInput';


// Maintenance categories with English/Malay labels
const MAINTENANCE_CATEGORIES = [
  { key: 'wakil_syabas', label: 'Wakil Syabas di tapak / Representative at Site' },
  { key: 'penyediaan_peralatan', label: 'Penyediaan peralatan keselamatan / Safety Equipment Preparation' },
  { key: 'lokasi_kebocoran', label: 'Lokasi Kebocoran / Leak Location' },
  { key: 'pemotongan_jalan', label: 'Kerja-kerja Pemotongan Jalan / Road Cutting Works' },
  { key: 'pengorekan', label: 'Kerja-kerja Pengorekan / Excavation Works' },
  { key: 'pembaikan1', label: 'Kerja-kerja Pembaikan / Repair Works' },
  { key: 'barangan_rosak', label: 'Barangan yang telah rosak/lama / Damaged/Old Items' },
  { key: 'barangan_ganti', label: 'Barangan yang akan diganti / Items to be Replaced' },
  { key: 'masukkan_pasir', label: 'Kerja memasukkan pasir / Sand Filling Works' },
  { key: 'mampatan_pasir', label: 'Kerja-kerja mampatan pasir lapisan pertama / First Layer Sand Compaction Works' },
  { key: 'mampatan_batu', label: 'Kerja-kerja mampatan batu pecah / Aggregate Compaction Works' },
  { key: 'pembaikan2', label: 'Kerja-kerja Pembaikan / Repair Works' },
  { key: 'siap_sepenuhnya', label: 'Kerja telah siap sepenuhnya / Work Fully Completed' },
  { key: 'gambar_papan_putih', label: 'Gambar Papan Putih / Whiteboard Picture' },
  { key: 'gambar_pengesahan', label: 'Gambar Pengesahan Tapak / Site Confirmation Picture' },
  { key: 'gambar_point_bocor_pembaikan', label: 'Gambar Point Bocor untuk Kerja Pembaikan / Leak Point Picture for Repair Work' },
  { key: 'gambar_point_bocor_sudah', label: 'Gambar Point Bocor yang telah Pembaikan / Leak Point Picture After Repair' },
  { key: 'gambar_barang_lama', label: 'Gambar Barang Lama yang telah rosak / Picture of Old Damaged Items' },
  { key: 'gambar_barang_baru', label: 'Gambar Barang Baru yang telah ditukar / Picture of New Replaced Items' },
];

// Premix categories with English/Malay labels
const PREMIX_CATEGORIES = [
  { key: 'kedalaman_keseluruhan', label: 'Gambar Kedalaman Keseluruhan / Overall Depth Picture' },
  { key: 'kedalaman_premix_kedua', label: 'Gambar Kedalaman Premix Lapisan Kedua / Second Layer Premix Depth Picture' },
  { key: 'tack_coat_pertama', label: 'Gambar Meletakkan Tack Coat Lapisan Pertama / First Layer Tack Coat Placement Picture' },
  { key: 'mampatan_premix_pertama', label: 'Kerja-kerja Mampatan Premix Lapisan Pertama / First Layer Premix Compaction Works' },
  { key: 'tack_coat_kedua', label: 'Gambar Meletakkan Tack Coat Lapisan Kedua / Second Layer Tack Coat Placement Picture' },
  { key: 'mampatan_premix_kedua', label: 'Kerja-kerja Mampatan Premix Lapisan Kedua / Second Layer Premix Compaction Works' },
  { key: 'keluasan_turapan', label: 'Gambar Keluasan Turapan / Pavement Area Picture' },
  { key: 'kerja_turapan_siap', label: 'Gambar Kerja Turapan Siap / Finished Pavement Work Picture' },
  { key: 'pengesahan_tapak', label: 'Gambar Pengesahan Tapak / Site Confirmation Picture' },
  { key: 'ukuran_premix', label: 'Gambar Ukuran Premix / Premix Size Picture' },
  { key: 'label_premix', label: 'Gambar Label Premix / Premix Label Picture' },
];
//old hydra
// --- Supabase REST API ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseTable = "reports";

// --- Helper: Get cookie by name ---
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
};

// --- Form Input Components ---
interface FormInputProps {
  label: string;
  placeholder: string;
  type?: 'text' | 'date' | 'time' | 'number';
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
}

interface FormTextareaProps {
  label: string;
  placeholder: string;
  rows?: number;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

const FormInput = ({ label, placeholder, type = 'text', value, onChange, readOnly = false }: FormInputProps) => (
  <div className="relative">
    <label className="text-sm font-medium text-gray-600 mb-1 block">{label}</label>
    <input
      type={type}
      min={type === 'number' ? "0" : undefined}
      onInput={type === 'number' ? (e) => {
        const target = e.target as HTMLInputElement;
        if (target.value && parseFloat(target.value) < 0) target.value = "0";
      } : undefined}
      className={`w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-800 transition duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${readOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
    />
  </div>
);
const getLocationAsync = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support location access.");
      reject("No geolocation");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        resolve({ lat, lng });
      },
      (err) => {
        toast.error("Unable to retrieve your location.");
        reject(err);
      }
    );
  });
};


const FormTextarea = ({ label, placeholder, rows = 3, value, onChange }: FormTextareaProps) => (
  <div className="relative">
    <label className="text-sm font-medium text-gray-600 mb-1 block">{label}</label>
    <textarea
      rows={rows}
      className="w-full p-3 border border-gray-300 rounded-xl bg-white text-gray-800 transition duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

// --- Dynamic List Input ---
interface ListInputProps {
  label: string;
  items: string[];
  setItems: (items: string[]) => void;
  placeholder?: string;
  inputValue: string;
  setInputValue: (val: string) => void;
}

const ListInput = ({ label, items, setItems, placeholder, inputValue, setInputValue }: ListInputProps) => {

  const safeItems = Array.isArray(items) ? items.filter(item => item && item.trim()) : [];

  const addItem = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue === "") {
      // Don't add empty items
      return;
    }
    const newItems = [...items, trimmedValue];
    setItems(newItems);
    setInputValue("");
  };

  const removeItem = (index: number) => {
    // Find the actual index in the original items array
    const itemToRemove = safeItems[index];
    const actualIndex = items.indexOf(itemToRemove);
    if (actualIndex !== -1) {
      const newItems = [...items];
      newItems.splice(actualIndex, 1);
      setItems(newItems);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="relative">
      <label className="text-sm font-medium text-gray-600 mb-1 block">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          className="flex-1 p-3 border border-gray-300 rounded-xl bg-white text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!inputValue.trim()}
          className={`px-4 py-2 font-semibold rounded-xl transition ${
            inputValue.trim()
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Add
        </button>
      </div>
      <ul className="list-disc list-inside space-y-1">
        {safeItems.map((item, idx) => (
          <li key={idx} className="flex justify-between items-center bg-gray-100 p-2 rounded-lg">
            {item}
            <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// DimensionInput component has been moved to ../components/DimensionInput.tsx

// --- Main Page ---
export default function ReportSubmissionPage() {
  const [activityId, setActivityId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [day, setDay] = useState("");
  const [duration, setDuration] = useState("");
  const [damageType, setDamageType] = useState("");
  const [equipmentList, setEquipmentList] = useState<string[]>([]);
  const [manpowerList, setManpowerList] = useState<string[]>([]);
  const [excavation, setExcavation] = useState<Dimensions | null>(null);
  const [sand, setSand] = useState<Dimensions | null>(null);
  const [aggregate, setAggregate] = useState<Dimensions | null>(null);
  const [premix, setPremix] = useState<Dimensions | null>(null);
  const [cement, setCement] = useState<Dimensions | null>(null);
  const [pipeUsage, setPipeUsage] = useState("");
  const [fittings, setFittings] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");
  
  // Pending inputs for lists
  const [equipmentInput, setEquipmentInput] = useState("");
  const [manpowerInput, setManpowerInput] = useState("");
  const [fittingsInput, setFittingsInput] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gmapLink, setGmapLink] = useState("");
  const [isOngoing, setIsOngoing] = useState(false);
  const [startedActivities, setStartedActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const [maintenancePhotos, setMaintenancePhotos] = useState<Record<string, {files: File[], urls: string[]}>>(() => {
    const initial: Record<string, {files: File[], urls: string[]}> = {};
    MAINTENANCE_CATEGORIES.forEach(cat => {
      initial[cat.key] = {files: [], urls: []};
    });
    return initial;
  });
  const [premixPhotos, setPremixPhotos] = useState<Record<string, {files: File[], urls: string[]}>>(() => {
    const initial: Record<string, {files: File[], urls: string[]}> = {};
    PREMIX_CATEGORIES.forEach(cat => {
      initial[cat.key] = {files: [], urls: []};
    });
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [activeTab, setActiveTab] = useState<'Report' | 'Maintenance' | 'Premix'>('Report');

  const username = getCookie("username") || "Unknown";

  useEffect(() => {
    if (date) {
      // Parse date in YYYY-MM-DD format
      const [year, month, dayPart] = date.split('-');
      const parsedDate = new Date(`${year}-${month}-${dayPart}`);
      const weekday = parsedDate.toLocaleDateString("en-US", { weekday: "long" });
      setDay(weekday);
    }
  }, [date]);
const MAX_VIDEO_SIZE_MB = 15;
const MAX_IMAGE_SIZE_MB_BEFORE_COMPRESSION = 20; // optional safety net
const MAX_TOTAL_FILES = 5;

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;

  const newValidFiles: File[] = [];

  for (const file of files) {
    const sizeInMB = file.size / (1024 * 1024);

    // Validate video size
    if (file.type.startsWith('video/')) {
      if (sizeInMB > MAX_VIDEO_SIZE_MB) {
        toast.error(`Video "${file.name}" is too large (${sizeInMB.toFixed(1)} MB). Max allowed: ${MAX_VIDEO_SIZE_MB} MB.`);
        continue;
      }
    }
    // Optional: Block extremely large images (before compression)
    else if (file.type.startsWith('image/') && sizeInMB > MAX_IMAGE_SIZE_MB_BEFORE_COMPRESSION) {
      toast.error(`Image "${file.name}" is too large (${sizeInMB.toFixed(1)} MB). Please choose a smaller image.`);
      continue;
    }

    newValidFiles.push(file);
  }

  // Enforce total file count limit (uploaded + pending)
  const totalFilesAfterAdd = uploadedPhotoUrls.length + photoFiles.length + newValidFiles.length;
  if (totalFilesAfterAdd > MAX_TOTAL_FILES) {
    toast.error(`You can only attach up to ${MAX_TOTAL_FILES} files in total.`);
    return;
  }

  // Add valid files
  setPhotoFiles(prev => [...prev, ...newValidFiles]);
};

const handleMaintenanceFileSelect = (categoryKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;

  const newValidFiles: File[] = [];

  for (const file of files) {
    const sizeInMB = file.size / (1024 * 1024);

    if (file.type.startsWith('video/')) {
      if (sizeInMB > MAX_VIDEO_SIZE_MB) {
        toast.error(`Video "${file.name}" is too large (${sizeInMB.toFixed(1)} MB). Max allowed: ${MAX_VIDEO_SIZE_MB} MB.`);
        continue;
      }
    } else if (file.type.startsWith('image/') && sizeInMB > MAX_IMAGE_SIZE_MB_BEFORE_COMPRESSION) {
      toast.error(`Image "${file.name}" is too large (${sizeInMB.toFixed(1)} MB). Please choose a smaller image.`);
      continue;
    }

    newValidFiles.push(file);
  }

  // Allow up to 10 files per category
  const currentFiles = maintenancePhotos[categoryKey].files.length + maintenancePhotos[categoryKey].urls.length;
  if (currentFiles + newValidFiles.length > 10) {
    toast.error(`Maximum 10 files allowed per category.`);
    return;
  }

  setMaintenancePhotos(prev => ({
    ...prev,
    [categoryKey]: {
      ...prev[categoryKey],
      files: [...prev[categoryKey].files, ...newValidFiles]
    }
  }));
};

const handlePremixFileSelect = (categoryKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;

  const newValidFiles: File[] = [];

  for (const file of files) {
    const sizeInMB = file.size / (1024 * 1024);

    if (file.type.startsWith('video/')) {
      if (sizeInMB > MAX_VIDEO_SIZE_MB) {
        toast.error(`Video "${file.name}" is too large (${sizeInMB.toFixed(1)} MB). Max allowed: ${MAX_VIDEO_SIZE_MB} MB.`);
        continue;
      }
    } else if (file.type.startsWith('image/') && sizeInMB > MAX_IMAGE_SIZE_MB_BEFORE_COMPRESSION) {
      toast.error(`Image "${file.name}" is too large (${sizeInMB.toFixed(1)} MB). Please choose a smaller image.`);
      continue;
    }

    newValidFiles.push(file);
  }

  // Allow up to 10 files per category
  const currentFiles = premixPhotos[categoryKey].files.length + premixPhotos[categoryKey].urls.length;
  if (currentFiles + newValidFiles.length > 10) {
    toast.error(`Maximum 10 files allowed per category.`);
    return;
  }

  setPremixPhotos(prev => ({
    ...prev,
    [categoryKey]: {
      ...prev[categoryKey],
      files: [...prev[categoryKey].files, ...newValidFiles]
    }
  }));
};
  const fetchStartedActivities = async () => {
    const res = await fetch(`${supabaseUrl}/rest/v1/${supabaseTable}?status=eq.Started&submitted_by=eq.${username}`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      setStartedActivities(data);
    }
  };

  useEffect(() => {
    fetchStartedActivities();
  }, []);

  const deleteActivity = async (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation(); // Prevent triggering the card click
    
    if (!window.confirm(`Are you sure you want to delete report ${activityId}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${supabaseTable}?activity_id=eq.${activityId}`, {
        method: "DELETE",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });

      if (!res.ok) throw new Error("Failed to delete activity");

      toast.success(`Activity ${activityId} deleted successfully.`);
      
      // If the deleted activity was selected, deselect it
      if (selectedActivity && selectedActivity.activity_id === activityId) {
        setSelectedActivity(null);
        setPhotoFiles([]);
        setUploadedPhotoUrls([]);
        const initialMaintenance: Record<string, {files: File[], urls: string[]}> = {};
        MAINTENANCE_CATEGORIES.forEach((cat) => {
          initialMaintenance[cat.key] = {files: [], urls: []};
        });
        setMaintenancePhotos(initialMaintenance);
        
        const initialPremix: Record<string, {files: File[], urls: string[]}> = {};
        PREMIX_CATEGORIES.forEach((cat) => {
          initialPremix[cat.key] = {files: [], urls: []};
        });
        setPremixPhotos(initialPremix);
      }
      
      fetchStartedActivities();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete activity.");
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
     toast.error("Your browser does not support location access.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos: GeolocationPosition) => {
        const { latitude, longitude } = pos.coords;
        setLatitude(latitude);
        setLongitude(longitude);
        setGmapLink(`https://maps.google.com/?q=${latitude},${longitude}`);
      },
      () => toast.error("Unable to retrieve your location.")
    );
  };

  const startActivity = async () => {
  if (!activityId) {
    toast.error("Activity ID is required to start.");
    return;
  }

  // WAIT FOR LOCATION
  setIsStarting(true);
  let lat = null;
  let lng = null;
  let link = null;

  try {
    const pos = await getLocationAsync();
    lat = pos.lat;
    lng = pos.lng;
    link = `https://maps.google.com/?q=${lat},${lng}`;

    setLatitude(lat);
    setLongitude(lng);
    setGmapLink(link);
  } catch (e) {
    console.error(e);
  }

  // Use Malaysia time zone
  const now = new Date();
  const malaysiaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kuala_Lumpur"}));
  const timeStr = malaysiaTime.toTimeString().slice(0, 5);
  const todayStr = `${malaysiaTime.getFullYear()}-${String(malaysiaTime.getMonth() + 1).padStart(2, '0')}-${String(malaysiaTime.getDate()).padStart(2, '0')}`; // YYYY-MM-DD format
  const weekdayStr = malaysiaTime.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kuala_Lumpur" });

  setStartTime(timeStr);
  setDate(todayStr);
  setDay(weekdayStr);

  const payload = {
    activity_id: activityId,
    date: todayStr,
    day: weekdayStr,
    start_time: timeStr,
    start_latitude: lat,
    start_longitude: lng,
    start_gmap_link: link,
    status: "Started",
    submitted_by: username,
  };

  try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${supabaseTable}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error(err);
        toast.error(`Start Failed: ${err.message || err.details || "Unknown error"}`);
        return;
      }

      const data = await res.json();
      toast.success(`Activity ${activityId} started at ${timeStr}`);
      fetchStartedActivities();
      
      if (data && data.length > 0) {
        selectActivity(data[0]);
      }
  } catch (err) {
      console.error(err);
      toast.error("An error occurred while starting activity.");
  } finally {
      setIsStarting(false);
  }
  };



  function selectActivity(activity: any) {
    setSelectedActivity(activity);
    setActivityId(activity.activity_id);
    setStartTime(activity.start_time);
    setLatitude(activity.end_latitude ?? activity.start_latitude);
    setLongitude(activity.end_longitude ?? activity.start_longitude);
    setGmapLink(activity.end_gmap_link ?? activity.start_gmap_link);
    setDate(activity.date || new Date().toISOString().slice(0,10));
    setDay(activity.day || new Date().toLocaleDateString("en-US", { weekday: "long" }));
    setDamageType(activity.damage_type || "");
    
    // Ensure we handle potential stringified JSON if DB returns text
    let eqList = activity.equipment_used;
    if (typeof eqList === 'string') {
        try { eqList = JSON.parse(eqList); } catch(e) { eqList = []; }
    }
    setEquipmentList(Array.isArray(eqList) ? eqList : []);

    let manList = activity.manpower_involved;
    if (typeof manList === 'string') {
        try { manList = JSON.parse(manList); } catch(e) { manList = []; }
    }
    setManpowerList(Array.isArray(manList) ? manList : []);

    // Helper to parse potential string or object dimensions
    const parseDimensions = (val: any): Dimensions | null => {
        if (!val) return null;
        if (typeof val === 'object') {
            return {
                length: val.length || "",
                width: val.width || "",
                depth: val.depth || ""
            };
        }
        if (typeof val === 'string') {
             // Try to parse JSON first
             try {
                const parsed = JSON.parse(val);
                if(typeof parsed === 'object') {
                     return {
                        length: parsed.length || "",
                        width: parsed.width || "",
                        depth: parsed.depth || ""
                     };
                }
             } catch(e) {
                 // Ignore
             }

            // Fallback to "LxWxD" string parsing
            const parts = val.toLowerCase().split('x');
            return {
                length: parts[0] || "",
                width: parts[1] || "",
                depth: parts[2] || ""
            };
        }
        return null;
    };

    setExcavation(parseDimensions(activity.excavation));
    setSand(parseDimensions(activity.sand));
    setAggregate(parseDimensions(activity.aggregate));
    setPremix(parseDimensions(activity.premix));
    setCement(parseDimensions(activity.cement));

    let fitList = activity.fittings;
    if (typeof fitList === 'string') {
        // Try to parse as JSON array first
        try {
            fitList = JSON.parse(fitList);
        } catch(e) {
            // If JSON parsing fails, treat as comma-separated string
            fitList = fitList.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        }
    }
    // Filter out empty/whitespace-only strings regardless of source
    setFittings(Array.isArray(fitList) ? fitList.filter((s: string) => s && s.trim()) : []);

    setPipeUsage(activity.pipe_usage || "");
    setRemarks(activity.remarks || "");
    setEndTime(activity.end_time || "");
    setDuration(activity.duration || "");

    // Handle photos if photo_link is JSON object (array or string)
    let photoData: {maintenance?: Record<string, string[]>, premix?: Record<string, string[]>} = {};
    if (activity.photo_link) {
      if (Array.isArray(activity.photo_link) && activity.photo_link.length > 0) {
        try {
          const parsed = JSON.parse(activity.photo_link[0]);
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            photoData = parsed;
          }
        } catch (e) {
          // Not JSON, keep as is
        }
      } else if (typeof activity.photo_link === 'string') {
        try {
          const parsed = JSON.parse(activity.photo_link);
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            photoData = parsed;
          }
        } catch (e) {
          // Not JSON, keep as is
        }
      }
    }

    // Set maintenance photos
    const newMaintenancePhotos: Record<string, {files: File[], urls: string[]}> = {};
    MAINTENANCE_CATEGORIES.forEach(cat => {
      newMaintenancePhotos[cat.key] = {files: [], urls: (photoData.maintenance && photoData.maintenance[cat.key]) || []};
    });
    setMaintenancePhotos(newMaintenancePhotos);

    // Set premix photos
    const newPremixPhotos: Record<string, {files: File[], urls: string[]}> = {};
    PREMIX_CATEGORIES.forEach(cat => {
      newPremixPhotos[cat.key] = {files: [], urls: (photoData.premix && photoData.premix[cat.key]) || []};
    });
    setPremixPhotos(newPremixPhotos);

    // For backward compatibility, set uploadedPhotoUrls if it's an array
    if (Array.isArray(activity.photo_link)) {
      setUploadedPhotoUrls(activity.photo_link);
    } else {
      setUploadedPhotoUrls([]);
    }
  }

  const handleSaveDraft = async () => {
    if (!selectedActivity) {
      toast.error("Select a started activity first.");
      return;
    }

    // Skipped validation for Draft

    setIsSubmitting(true);

    try {
      // --- Upload photos first (Parallel & Compressed) ---
      let photoLinks: string[] = [...uploadedPhotoUrls]; // existing uploaded URLs

      if (photoFiles.length > 0) {
        const uploadPromises = photoFiles.map(async (file) => {
          try {
            // Compression
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            };
            const compressedFile = await imageCompression(file, options);
            
            const formData = new FormData();
            formData.append("file", compressedFile);

            const uploadRes = await fetch(
              "https://azmiproductions.com/api/hydra/upload.php",
              {
                method: "POST",
                body: formData,
              }
            );

            if (!uploadRes.ok) throw new Error("Upload failed");
            
            const data = await uploadRes.json();
            return data.url;
          } catch (error) {
            console.error("Error uploading file:", error);
            toast.error(`Failed to upload one of the images.`);
            return null;
          }
        });

        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter((url): url is string => url !== null);
        photoLinks = [...photoLinks, ...successfulUploads];

        // Clear local files after upload attempt
        setUploadedPhotoUrls(photoLinks);
        setPhotoFiles([]);
      }

      // --- Calculate Duration for Draft (optional, but good to have current snapshot) ---
      const now = new Date();
      const malaysiaNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kuala_Lumpur"}));

      // Date is already in YYYY-MM-DD format
      const isoDateStr = date;
      const startDateTime = new Date(`${isoDateStr}T${startTime}:00`);

      if (isNaN(startDateTime.getTime())) {
        startDateTime.setTime(malaysiaNow.getTime());
      }
      if (malaysiaNow < startDateTime) {
        startDateTime.setDate(startDateTime.getDate() - 1);
      }
      let diffHours = (malaysiaNow.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
      if (isNaN(diffHours) || diffHours < 0.05) {
        diffHours = 0.05;
      }
      const finalDurationStr = diffHours.toFixed(2);

      // Do not update location for draft to avoid capturing end_time prematurely

      // Capture pending inputs for Equipment and Manpower
      const finalEquipmentList = [...equipmentList];
      if (equipmentInput.trim()) {
        finalEquipmentList.push(equipmentInput.trim());
        setEquipmentList(finalEquipmentList);
        setEquipmentInput("");
      }

      const finalManpowerList = [...manpowerList];
      if (manpowerInput.trim()) {
        finalManpowerList.push(manpowerInput.trim());
        setManpowerList(finalManpowerList);
        setManpowerInput("");
      }

    const finalFittingsList = [...fittings].filter(item => item && item.trim());

    // Upload maintenance photos
    const maintenancePhotoUrls: Record<string, string[]> = {};
    for (const cat of MAINTENANCE_CATEGORIES) {
      const catPhotos = maintenancePhotos[cat.key];
      if (catPhotos.files.length > 0) {
        const uploadPromises = catPhotos.files.map(async (file) => {
          try {
            let finalFile = file;
            if (file.type.startsWith('image/')) {
              const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
              };
              finalFile = await imageCompression(file, options);
            }
            const formData = new FormData();
            formData.append("file", finalFile);
            const uploadRes = await fetch("https://azmiproductions.com/api/hydra/upload.php", {
              method: "POST",
              body: formData,
            });
            if (!uploadRes.ok) throw new Error("Upload failed");
            const data = await uploadRes.json();
            return data.url;
          } catch (error) {
            console.error("Error uploading file:", error);
            toast.error(`Failed to upload one of the images for ${cat.label}.`);
            return null;
          }
        });
        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter((url): url is string => url !== null);
        maintenancePhotoUrls[cat.key] = [...catPhotos.urls, ...successfulUploads];
      } else {
        maintenancePhotoUrls[cat.key] = catPhotos.urls;
      }
    }

    // Upload premix photos
    const premixPhotoUrls: Record<string, string[]> = {};
    for (const cat of PREMIX_CATEGORIES) {
      const catPhotos = premixPhotos[cat.key];
      if (catPhotos.files.length > 0) {
        const uploadPromises = catPhotos.files.map(async (file) => {
          try {
            let finalFile = file;
            if (file.type.startsWith('image/')) {
              const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
              };
              finalFile = await imageCompression(file, options);
            }
            const formData = new FormData();
            formData.append("file", finalFile);
            const uploadRes = await fetch("https://azmiproductions.com/api/hydra/upload.php", {
              method: "POST",
              body: formData,
            });
            if (!uploadRes.ok) throw new Error("Upload failed");
            const data = await uploadRes.json();
            return data.url;
          } catch (error) {
            console.error("Error uploading file:", error);
            toast.error(`Failed to upload one of the images for ${cat.label}.`);
            return null;
          }
        });
        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter((url): url is string => url !== null);
        premixPhotoUrls[cat.key] = [...catPhotos.urls, ...successfulUploads];
      } else {
        premixPhotoUrls[cat.key] = catPhotos.urls;
      }
    }

    // Clear local files
    const maintenanceState: Record<string, {files: File[], urls: string[]}> = {};
    MAINTENANCE_CATEGORIES.forEach((cat) => {
      maintenanceState[cat.key] = {files: [], urls: maintenancePhotoUrls[cat.key]};
    });
    setMaintenancePhotos(maintenanceState);

    const premixState: Record<string, {files: File[], urls: string[]}> = {};
    PREMIX_CATEGORIES.forEach((cat) => {
      premixState[cat.key] = {files: [], urls: premixPhotoUrls[cat.key]};
    });
    setPremixPhotos(premixState);

    // Set photo_link as JSON string wrapped in array for text[] column
    const photoData = { maintenance: maintenancePhotoUrls, premix: premixPhotoUrls };
    const photoLinkData = JSON.stringify(photoData);

    const payload = {
        date,
        start_time: startTime,
        // Do not set end_time for draft
        day,
        duration: finalDurationStr,
        damage_type: damageType,
        equipment_used: finalEquipmentList,
        manpower_involved: finalManpowerList,
        excavation: excavation || null,
        sand: sand || null,
        aggregate: aggregate || null,
        premix: premix || null,
        cement: cement || null,
        pipe_usage: pipeUsage || null,
        fittings: finalFittingsList,
        remarks,
        // Do not update end location for draft
        photo_link: [photoLinkData],
        status: "Started", // IMPORTANT: Keep status as Started
      };

      const res = await fetch(
        `${supabaseUrl}/rest/v1/${supabaseTable}?activity_id=eq.${selectedActivity.activity_id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        console.error(err);
        toast.error(`Save Draft Failed: ${err.message || "Unknown error"}`);
        return;
      }

      toast.success(`Draft saved for ${activityId}!`);
      
      // Clear selection to go back to list view
      setSelectedActivity(null);
      setPhotoFiles([]);
      setUploadedPhotoUrls([]);
      const initialPremix: Record<string, {files: File[], urls: string[]}> = {};
      PREMIX_CATEGORIES.forEach((cat) => {
        initialPremix[cat.key] = {files: [], urls: []};
      });
      setPremixPhotos(initialPremix);

      fetchStartedActivities();
      
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during save draft.");
    } finally {
      setIsSubmitting(false);
    }
  };

const handleSubmit = async () => {
  if (!selectedActivity) {
    toast.error("Select a started activity first.");
    return;
  }

  // --- Validation: Enforce all fields ---
  if (!damageType  || !date || !startTime) {
      toast.error("Please fill in all required fields (Damage Type, Remarks).");
      return;
  }

  setIsSubmitting(true);

  try {
    // --- Upload photos first (Parallel & Compressed) ---
    let photoLinks: string[] = [...uploadedPhotoUrls]; // existing uploaded URLs

    if (photoFiles.length > 0) {
     const uploadPromises = photoFiles.map(async (file) => {
  try {
    let finalFile = file;

    // Only compress images
    if (file.type.startsWith('image/')) {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      finalFile = await imageCompression(file, options);
    }

    const formData = new FormData();
    formData.append("file", finalFile);

    const uploadRes = await fetch("https://azmiproductions.com/api/hydra/upload.php", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) throw new Error("Upload failed");

    const data = await uploadRes.json();
    return data.url;
  } catch (error) {
    console.error("Error uploading file:", error);
    toast.error(`Failed to upload: ${file.name}`);
    return null;
  }
});

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((url): url is string => url !== null);
      photoLinks = [...photoLinks, ...successfulUploads];

      // Clear local files after upload attempt
      setUploadedPhotoUrls(photoLinks);
      setPhotoFiles([]);
    }

    // Upload maintenance photos
    const maintenancePhotoUrls: Record<string, string[]> = {};
    for (const cat of MAINTENANCE_CATEGORIES) {
      const catPhotos = maintenancePhotos[cat.key];
      if (catPhotos.files.length > 0) {
        const uploadPromises = catPhotos.files.map(async (file) => {
          try {
            let finalFile = file;
            if (file.type.startsWith('image/')) {
              const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
              };
              finalFile = await imageCompression(file, options);
            }
            const formData = new FormData();
            formData.append("file", finalFile);
            const uploadRes = await fetch("https://azmiproductions.com/api/hydra/upload.php", {
              method: "POST",
              body: formData,
            });
            if (!uploadRes.ok) throw new Error("Upload failed");
            const data = await uploadRes.json();
            return data.url;
          } catch (error) {
            console.error("Error uploading file:", error);
            toast.error(`Failed to upload one of the images for ${cat.label}.`);
            return null;
          }
        });
        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter((url): url is string => url !== null);
        maintenancePhotoUrls[cat.key] = [...catPhotos.urls, ...successfulUploads];
      } else {
        maintenancePhotoUrls[cat.key] = catPhotos.urls;
      }
    }

    // Upload premix photos
    const premixPhotoUrls: Record<string, string[]> = {};
    for (const cat of PREMIX_CATEGORIES) {
      const catPhotos = premixPhotos[cat.key];
      if (catPhotos.files.length > 0) {
        const uploadPromises = catPhotos.files.map(async (file) => {
          try {
            let finalFile = file;
            if (file.type.startsWith('image/')) {
              const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
              };
              finalFile = await imageCompression(file, options);
            }
            const formData = new FormData();
            formData.append("file", finalFile);
            const uploadRes = await fetch("https://azmiproductions.com/api/hydra/upload.php", {
              method: "POST",
              body: formData,
            });
            if (!uploadRes.ok) throw new Error("Upload failed");
            const data = await uploadRes.json();
            return data.url;
          } catch (error) {
            console.error("Error uploading file:", error);
            toast.error(`Failed to upload one of the images for ${cat.label}.`);
            return null;
          }
        });
        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter((url): url is string => url !== null);
        premixPhotoUrls[cat.key] = [...catPhotos.urls, ...successfulUploads];
      } else {
        premixPhotoUrls[cat.key] = catPhotos.urls;
      }
    }

    // Clear local files
    const maintenanceStateSubmit: Record<string, {files: File[], urls: string[]}> = {};
    MAINTENANCE_CATEGORIES.forEach((cat) => {
      maintenanceStateSubmit[cat.key] = {files: [], urls: maintenancePhotoUrls[cat.key]};
    });
    setMaintenancePhotos(maintenanceStateSubmit);

    const premixStateSubmit: Record<string, {files: File[], urls: string[]}> = {};
    PREMIX_CATEGORIES.forEach((cat) => {
      premixStateSubmit[cat.key] = {files: [], urls: premixPhotoUrls[cat.key]};
    });
    setPremixPhotos(premixStateSubmit);
    // Set photo_link as JSON string
    const photoData = { maintenance: maintenancePhotoUrls, premix: premixPhotoUrls };
    const photoLinkData = JSON.stringify(photoData);

    // --- FIXED DURATION LOGIC (Handles cross-day correctly) ---
    const now = new Date();
    const malaysiaNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kuala_Lumpur"}));

    // Validate date and startTime presence
    if (!date || !startTime) {
       console.error("Missing Date or StartTime", date, startTime);
       toast.error("Invalid Activity Start Time. Please restart activity.");
       setIsSubmitting(false);
       return;
    }

    // Date is already in YYYY-MM-DD format
    const isoDateStr = date;
    const startDateTime = new Date(`${isoDateStr}T${startTime}:00`);

    if (isNaN(startDateTime.getTime())) {
      console.error("Invalid Start Date/Time", date, startTime);
      // Fallback or error - deciding to set to now so duration is minimal
      startDateTime.setTime(malaysiaNow.getTime());
    }

    // If current time is earlier than start datetime → activity crossed to next day
    if (malaysiaNow < startDateTime) {
      startDateTime.setDate(startDateTime.getDate() - 1);
    }

    let diffHours = (malaysiaNow.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

    // Enforce minimum duration of 0.05 hours (3 mins)
    if (isNaN(diffHours) || diffHours < 0.05) {
      diffHours = 0.05;
    }

    const finalDurationStr = diffHours.toFixed(2);

    const malaysiaEndTime = malaysiaNow.toTimeString().slice(0, 5);
    setEndTime(malaysiaEndTime);
    setDuration(finalDurationStr);

    // --- Update location ---
    getLocation();

    // --- Update location ---
    getLocation();

    // Capture pending inputs for Equipment and Manpower
    const finalEquipmentList = [...equipmentList];
    if (equipmentInput.trim()) {
      finalEquipmentList.push(equipmentInput.trim());
      setEquipmentList(finalEquipmentList);
      setEquipmentInput("");
    }

    const finalManpowerList = [...manpowerList];
    if (manpowerInput.trim()) {
      finalManpowerList.push(manpowerInput.trim());
      setManpowerList(finalManpowerList);
      setManpowerInput("");
    }

    const finalFittingsList = [...fittings].filter(item => item && item.trim());

    const payload = {
      date,
      start_time: startTime,
      end_time: malaysiaEndTime,
      day,
      duration: finalDurationStr,
      damage_type: damageType,
      equipment_used: finalEquipmentList,
      manpower_involved: finalManpowerList,
      excavation: excavation || null,
      sand: sand || null,
      aggregate: aggregate || null,
      premix: premix || null,
      cement: cement || null,
      pipe_usage: pipeUsage || null,
      fittings: finalFittingsList,
      remarks,
      end_latitude: latitude,
      end_longitude: longitude,
      end_gmap_link: gmapLink,
      photo_link: [photoLinkData],
      status: "Pending",
    };

    const res = await fetch(
      `${supabaseUrl}/rest/v1/${supabaseTable}?activity_id=eq.${selectedActivity.activity_id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      console.error(err);
      toast.error(`Submit Failed: ${err.message || err.details || err.hint || "Unknown error"}`);
      return;
    }

    toast.success(`Report for ${activityId} submitted successfully!`);
    setIsOngoing(false);
    setSelectedActivity(null);
    setPhotoFiles([]);
    fetchStartedActivities();
    
  } catch (err) {
    console.error(err);
    toast.error("An error occurred during submission.");
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto">
        <header className="mb-12 pt-2 pb-4 border-b-2 border-gray-300">

          <div className="flex items-center gap-3">
            {selectedActivity && (
              <button
                onClick={() => {
                  setSelectedActivity(null);
                  setPhotoFiles([]);
                  setUploadedPhotoUrls([]);
                  const initialMaintenance: Record<string, {files: File[], urls: string[]}> = {};
                  MAINTENANCE_CATEGORIES.forEach((cat) => {
                    initialMaintenance[cat.key] = {files: [], urls: []};
                  });
                  setMaintenancePhotos(initialMaintenance);
                  
                  const initialPremix: Record<string, {files: File[], urls: string[]}> = {};
                  PREMIX_CATEGORIES.forEach((cat) => {
                    initialPremix[cat.key] = {files: [], urls: []};
                  });
                  setPremixPhotos(initialPremix);
                }}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                title="Back to Activity List"
              >
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </button>
            )}
            <h1 className="text-2xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
              Report Submission
            </h1>
          </div>
          <p className="text-gray-500 mt-2 italic text-lg">
            Start activity or select a started activity to complete the report.
          </p>
        </header>



        {/* Tabs moved to top, outside the grid */}
        {selectedActivity && (
          <div className="flex bg-white/50 p-1.5 rounded-2xl mb-8 backdrop-blur-sm border border-gray-200 shadow-sm max-w-2xl mx-auto">
            {(['Report', 'Maintenance', 'Premix'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 transform scale-105'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}


        {/* Unified Content Area */}
        <div className={`transition-all duration-300 ${activeTab === 'Maintenance' ? 'max-w-5xl mx-auto' : 'max-w-7xl mx-auto'}`}> 


           {/* --- TAB CONTENT --- */}
           
           {/* REPORT TAB or (!selectedActivity to show ID input) */}
           {(!selectedActivity || activeTab === 'Report') && (
           <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-slide-down">
                  
                  {/* LEFT COLUMN: Activity & Timing */}
                  <div className="xl:col-span-2 space-y-6">
                      {/* Activity & Location Details */}
                      <div className="bg-white shadow-xl rounded-3xl p-6 border border-gray-100 space-y-6">
                          <h2 className="flex items-center text-xl font-semibold text-blue-700 border-b pb-2">
                            <MapPin className="w-5 h-5 mr-2" /> Activity & Location Details
                          </h2>
                          <FormInput label="Activity ID" placeholder="Enter Activity ID" value={activityId} onChange={(e) => setActivityId(e.target.value)} />
                          
                          {!selectedActivity && (
                            <button
                              onClick={startActivity}
                              className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition font-semibold"
                              disabled={isOngoing}
                            >
                              Start Activity
                            </button>
                          )}
                      </div>

                      {/* Timing & Outcome (Only show if selected) */}
                      {selectedActivity && (
                        <div className="bg-white shadow-xl rounded-3xl p-6 border border-gray-100 space-y-6">
                          <h2 className="flex items-center text-xl font-semibold text-green-700 border-b pb-2">
                            <Calendar className="w-5 h-5 mr-2" /> Timing & Outcome
                          </h2>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <FormInput label="Date" type="date" placeholder="YYYY-MM-DD" value={date ?? ""} onChange={(e) => setDate(e.target.value)} readOnly />
                            <FormInput label="Start Time" placeholder="Auto" value={startTime ?? ""} readOnly />
                            <FormInput label="End Time" placeholder="Auto" value={endTime ?? ""} readOnly />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <FormInput label="Day" placeholder="Auto-calculated" value={day ?? ""} readOnly />
                            <FormInput label="Duration (Hours)" placeholder="Auto-calculated" value={duration ?? ""} readOnly />
                          </div>
                          <hr className="border-gray-100 pt-3" />
                          <FormInput label="Jenis Kerosakan /  Damage Type" placeholder="e.g., Burst Pipe" value={damageType} onChange={(e) => setDamageType(e.target.value)} />
                        </div>
                      )}
                  </div>

                  {/* RIGHT COLUMN: Started Activities Overview (When nothing selected) */}
                  {!selectedActivity && startedActivities.length > 0 && (
                     <div className="xl:col-span-1 space-y-6">
                        <div className="bg-white shadow-xl rounded-3xl p-6 border border-gray-100 space-y-4">
                           <h2 className="text-lg font-semibold text-blue-700 border-b pb-2">Started Activities</h2>
                           <div className="flex flex-col gap-4">
                             {startedActivities.map((act, idx) => (
                               <div
                                 key={idx}
                                 className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition cursor-pointer flex flex-col gap-2"
                                 onClick={() => selectActivity(act)}
                               >
                                  <div className="flex justify-between items-start">
                                     <span className="font-bold text-blue-600">{act.activity_id}</span>
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); deleteActivity(e, act.activity_id); }}
                                       className="p-1 rounded-full text-gray-400 hover:text-red-500 transition"
                                     >
                                       <X className="w-4 h-4" />
                                     </button>
                                  </div>
                                  <div className="text-sm text-gray-500">{act.start_time}</div>
                                  {act.damage_type && (
                                    <div className="text-sm text-gray-700">
                                      <span className="font-medium">Damage:</span> {act.damage_type}
                                    </div>
                                  )}
                                   <button className="w-full mt-2 py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-100 transition">
                                      Resume
                                   </button>
                               </div>
                             ))}
                           </div>
                        </div>
                     </div>
                  )}

                  {/* RIGHT COLUMN: Resources, Materials, Photos, Actions */}
                  {selectedActivity && (
                      <div className="xl:col-span-1 space-y-6">
                          {/* Resources & Materials */}
                          <div className="bg-white shadow-xl rounded-3xl p-6 border border-gray-100 space-y-6">
                              <h2 className="flex items-center text-xl font-semibold text-purple-700 border-b pb-2">
                                <Briefcase className="w-5 h-5 mr-2" /> Resources & Materials
                              </h2>
                              <ListInput 
                                label="Peralatan Digunakan / Equipment Used" 
                                items={equipmentList} 
                                setItems={setEquipmentList} 
                                placeholder="Add equipment" 
                                inputValue={equipmentInput}
                                setInputValue={setEquipmentInput}
                              />
                              <ListInput 
                                label="Tenaga Kerja / Manpower Involved" 
                                items={manpowerList} 
                                setItems={setManpowerList} 
                                placeholder="Add manpower" 
                                inputValue={manpowerInput}
                                setInputValue={setManpowerInput}
                              />
                          </div>

                          {/* Material Quantities */}
                          <div className="bg-white shadow-xl rounded-3xl p-6 border border-gray-100 space-y-6">
                               <h2 className="flex items-center text-xl font-semibold text-blue-600 border-b pb-2">
                                   <Briefcase className="w-5 h-5 mr-2" /> Materials Quantities
                               </h2>
                               <div className="grid grid-cols-1 gap-4">
                                     <DimensionInput label="Excavation (m³)" value={excavation} onChange={setExcavation} />
                                     <DimensionInput label="Sand (m³)" value={sand} onChange={setSand} />
                                     <DimensionInput label="Aggregate (m³)" value={aggregate} onChange={setAggregate} />
                                     <DimensionInput label="Premix (kg)" value={premix} onChange={setPremix} showDepth={false} />
                                     <DimensionInput label="Cement (kg)" value={cement} onChange={setCement} showDepth={false} />
                               </div>
                               
                               <div className="pt-4 border-t border-gray-100 space-y-4">
                                  <FormInput
                                      label="Pipe Usage (m)"
                                      placeholder="e.g. 5"
                                      type="number"
                                      value={pipeUsage}
                                      onChange={(e) => setPipeUsage(e.target.value)}
                                  />
                                  <ListInput
                                      label="Fittings"
                                      items={fittings}
                                      setItems={setFittings}
                                      placeholder="Add fitting"
                                      inputValue={fittingsInput}
                                      setInputValue={setFittingsInput}
                                  />
                                  <FormTextarea label="Remarks" placeholder="Any remarks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                               </div>
                          </div>

                          {/* Photos */}
                          <div className="bg-white shadow-xl rounded-3xl p-6 border border-gray-100 space-y-6">
                              <h2 className="flex items-center text-xl font-semibold text-gray-800 border-b pb-2">
                                  <Camera className="w-5 h-5 mr-2"/> Attach Photos & Evidence
                              </h2>
                               <label htmlFor="file-upload" className="block cursor-pointer">
                                  <div className="flex items-center justify-center h-24 border-2 border-dashed border-blue-300 rounded-xl p-4 bg-blue-50/50 hover:bg-blue-50 transition-all duration-200 group">
                                    <div className="flex flex-col items-center space-y-2 text-center">
                                      <Camera className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                                      <span className="text-sm font-semibold text-blue-600">Tap to upload images/video</span>
                                    </div>
                                  </div>
                                </label>
                                 <input id="file-upload" type="file" accept="image/*,video/*" multiple capture="environment" onChange={handleFileSelect} className="sr-only"/>
                                 
                                {(photoFiles.length > 0 || uploadedPhotoUrls.length > 0) && (
                                  <div className="grid grid-cols-3 gap-2">
                                      {uploadedPhotoUrls.map((url, idx) => (
                                         <div key={`url-${idx}`} className="relative h-20 rounded-lg overflow-hidden border border-gray-200 group">
                                            <img src={url} className="w-full h-full object-cover" />
                                         </div>
                                      ))}
                                      {photoFiles.map((file, idx) => (
                                          <div key={`file-${idx}`} className="relative h-20 rounded-lg overflow-hidden border border-blue-300 shadow-sm">
                                              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">{file.name.substring(0, 5)}...</div>
                                               <button onClick={() => {
                                                  const newFiles = [...photoFiles];
                                                  newFiles.splice(idx, 1);
                                                  setPhotoFiles(newFiles);
                                               }} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg">
                                                  <X className="w-3 h-3" />
                                               </button>
                                          </div>
                                      ))}
                                  </div>
                                )}
                          </div>
                          
                          {/* Actions */}
                           <div className="flex flex-col gap-3">
                                <button
                                  onClick={handleSaveDraft}
                                  disabled={isSubmitting}
                                  className={`w-full py-3 text-blue-700 font-bold rounded-xl border-2 border-blue-600 hover:bg-blue-50 transition ${isSubmitting ? "opacity-50" : ""}`}
                                >
                                   Save Draft
                                </button>
                                <button
                                  onClick={handleSubmit}
                                  disabled={isSubmitting}
                                  className={`w-full py-3 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center ${
                                    isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                                  }`}
                                >
                                  {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                                  {isSubmitting ? "Submitting..." : "Submit Report"}
                                </button>
                           </div>
                      </div>
                  )}
              </div>
           )}

           {/* MAINTENANCE TAB - Form for 19 categories */}
           {selectedActivity && activeTab === 'Maintenance' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-down">
                  {MAINTENANCE_CATEGORIES.map((cat) => {
                    const photos = maintenancePhotos[cat.key];
                    return (
                      <div key={cat.key} className="bg-white shadow-xl rounded-3xl p-6 border border-gray-100 space-y-4">
                        <h3 className="text-lg font-semibold text-blue-700 border-b pb-2">{cat.label}</h3>
                        <label htmlFor={`maintenance-upload-${cat.key}`} className="block cursor-pointer">
                          <div className="flex items-center justify-center h-32 border-2 border-dashed border-blue-300 rounded-xl p-4 bg-blue-50/50 hover:bg-blue-50 transition-all duration-200 group">
                            <div className="flex flex-col items-center space-y-2 text-center">
                              <Camera className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
                              <span className="text-sm font-semibold text-blue-600">Add Photo</span>
                            </div>
                          </div>
                        </label>
                        <input id={`maintenance-upload-${cat.key}`} type="file" accept="image/*,video/*" multiple capture="environment" onChange={handleMaintenanceFileSelect(cat.key)} className="sr-only"/>
                        {(photos.files.length > 0 || photos.urls.length > 0) && (
                          <div className="grid grid-cols-1 gap-4">
                            {photos.urls.map((url, idx) => (
                              <div key={`url-${idx}`} className="relative h-64 rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                <img src={url} className="w-full h-full object-cover" />
                                <button onClick={() => {
                                  setMaintenancePhotos(prev => ({
                                    ...prev,
                                    [cat.key]: {
                                      ...prev[cat.key],
                                      urls: prev[cat.key].urls.filter((_, i) => i !== idx)
                                    }
                                  }));
                                }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-sm hover:scale-110 transition">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {photos.files.map((file, idx) => (
                              <div key={`file-${idx}`} className="relative h-64 rounded-xl overflow-hidden border border-blue-300 shadow-md">
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center flex-col gap-2">
                                  <Camera className="w-8 h-8 text-gray-400"/>
                                  <span className="text-sm text-gray-500 font-medium">{file.name}</span>
                                </div>
                                <button onClick={() => {
                                  setMaintenancePhotos(prev => ({
                                    ...prev,
                                    [cat.key]: {
                                      ...prev[cat.key],
                                      files: prev[cat.key].files.filter((_, i) => i !== idx)
                                    }
                                  }));
                                }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-sm hover:scale-110 transition">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Actions for Maintenance Tab */}
                <div className="flex flex-col gap-3 mt-8">
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSubmitting}
                    className={`w-full py-3 text-blue-700 font-bold rounded-xl border-2 border-blue-600 hover:bg-blue-50 transition ${isSubmitting ? "opacity-50" : ""}`}
                  >
                     Save Draft
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`w-full py-3 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center ${
                      isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                    {isSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </>
           )}

           {/* PREMIX TAB - Form for 11 categories */}
           {selectedActivity && activeTab === 'Premix' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-down">
                  {PREMIX_CATEGORIES.map((cat) => {
                    const photos = premixPhotos[cat.key];
                    return (
                      <div key={cat.key} className="bg-white shadow-xl rounded-3xl p-6 border border-gray-100 space-y-4">
                        <h3 className="text-lg font-semibold text-blue-700 border-b pb-2">{cat.label}</h3>
                        <label htmlFor={`premix-upload-${cat.key}`} className="block cursor-pointer">
                          <div className="flex items-center justify-center h-32 border-2 border-dashed border-blue-300 rounded-xl p-4 bg-blue-50/50 hover:bg-blue-50 transition-all duration-200 group">
                            <div className="flex flex-col items-center space-y-2 text-center">
                              <Camera className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
                              <span className="text-sm font-semibold text-blue-600">Add Photo</span>
                            </div>
                          </div>
                        </label>
                        <input id={`premix-upload-${cat.key}`} type="file" accept="image/*,video/*" multiple capture="environment" onChange={handlePremixFileSelect(cat.key)} className="sr-only"/>
                        {(photos.files.length > 0 || photos.urls.length > 0) && (
                          <div className="grid grid-cols-1 gap-4">
                            {photos.urls.map((url, idx) => (
                              <div key={`url-${idx}`} className="relative h-64 rounded-xl overflow-hidden border border-gray-200 shadow-md">
                                <img src={url} className="w-full h-full object-cover" />
                                <button onClick={() => {
                                  setPremixPhotos(prev => ({
                                    ...prev,
                                    [cat.key]: {
                                      ...prev[cat.key],
                                      urls: prev[cat.key].urls.filter((_, i) => i !== idx)
                                    }
                                  }));
                                }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-sm hover:scale-110 transition">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {photos.files.map((file, idx) => (
                              <div key={`file-${idx}`} className="relative h-64 rounded-xl overflow-hidden border border-blue-300 shadow-md">
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center flex-col gap-2">
                                  <Camera className="w-8 h-8 text-gray-400"/>
                                  <span className="text-sm text-gray-500 font-medium">{file.name}</span>
                                </div>
                                <button onClick={() => {
                                  setPremixPhotos(prev => ({
                                    ...prev,
                                    [cat.key]: {
                                      ...prev[cat.key],
                                      files: prev[cat.key].files.filter((_, i) => i !== idx)
                                    }
                                  }));
                                }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-sm hover:scale-110 transition">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Actions for Premix Tab */}
                <div className="flex flex-col gap-3 mt-8">
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSubmitting}
                    className={`w-full py-3 text-blue-700 font-bold rounded-xl border-2 border-blue-600 hover:bg-blue-50 transition ${isSubmitting ? "opacity-50" : ""}`}
                  >
                     Save Draft
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`w-full py-3 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center ${
                      isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                    {isSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </>
           )}



        </div>
      </div>
      
      {/* Loading Overlay */}
      {isStarting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center shadow-2xl max-w-sm w-full text-center">
             <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
             <h3 className="text-xl font-bold text-gray-900 mb-2">Starting Activity...</h3>
             <p className="text-gray-600">Please wait while we create the activity report.</p>
          </div>
        </div>
      )}
    </div>
  );
}
