import { useState, ChangeEvent, useEffect } from "react";
import toast from "react-hot-toast";
import { MapPin, Calendar, Briefcase, Camera, X, Trash2 } from 'lucide-react';

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
}

const ListInput = ({ label, items, setItems, placeholder }: ListInputProps) => {
  const [input, setInput] = useState("");

  const addItem = () => {
    if (!input.trim()) return;
    setItems([...items, input.trim()]);
    setInput("");
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button type="button" onClick={addItem} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition">
          Add
        </button>
      </div>
      <ul className="list-disc list-inside space-y-1">
        {items.map((item, idx) => (
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
  const [excavation, setExcavation] = useState("");
  const [sand, setSand] = useState("");
  const [aggregate, setAggregate] = useState("");
  const [premix, setPremix] = useState("");
  const [pipeUsage, setPipeUsage] = useState("");
  const [fittings, setFittings] = useState("");
  const [remarks, setRemarks] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gmapLink, setGmapLink] = useState("");
  const [isOngoing, setIsOngoing] = useState(false);
  const [startedActivities, setStartedActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);

  const username = getCookie("username") || "Unknown";

  useEffect(() => {
    if (date) {
      const d = new Date(date);
      const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
      setDay(weekday);
    }
  }, [date]);

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

  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 5);
  const todayStr = now.toISOString().slice(0, 10);
  const weekdayStr = now.toLocaleDateString("en-US", { weekday: "long" });

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
    toast.error("Failed to start activity. Check console.");
    return;
  }

  toast.success(`Activity ${activityId} started at ${timeStr}`);
  fetchStartedActivities();
  window.location.reload();
};


  const selectActivity = (activity: any) => {
    setSelectedActivity(activity);
    setActivityId(activity.activity_id);
    setStartTime(activity.start_time);
    setLatitude(activity.end_latitude ?? activity.start_latitude);
    setLongitude(activity.end_longitude ?? activity.start_longitude);
    setGmapLink(activity.end_gmap_link ?? activity.start_gmap_link);
    setDate(activity.date || new Date().toISOString().slice(0,10));
    setDay(activity.day || new Date().toLocaleDateString("en-US", { weekday: "long" }));
    setDamageType(activity.damage_type || "");
    setEquipmentList(activity.equipment_used || []);
    setManpowerList(activity.manpower_involved || []);
    setExcavation(activity.excavation || "");
    setSand(activity.sand || "");
    setAggregate(activity.aggregate || "");
    setPremix(activity.premix || "");
    setPipeUsage(activity.pipe_usage || "");
    setFittings(activity.fittings || "");
    setRemarks(activity.remarks || "");
    setEndTime(activity.end_time || "");
    setDuration(activity.duration || "");
    setUploadedPhotoUrls(activity.photo_link || []);
  };

const handleSubmit = async () => {
  if (!selectedActivity) {
    toast("Select a started activity first.");
    return;
  }

  // --- Upload photos first ---
  let photoLinks: string[] = [...uploadedPhotoUrls]; // existing uploaded URLs

  if (photoFiles.length > 0) {
    for (const file of photoFiles) {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(
        "https://azmiproductions.com/api/hydra/upload.php",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        console.error("Upload error:", text);
        toast.error("Failed to upload a photo. Check console.");
        return;
      }

      const data = await uploadRes.json();
      console.log("Uploaded file:", data);

      // --- Add the uploaded file URL to photoLinks ---
      if (data.url) {
        photoLinks.push(data.url);
      }
    }

    // Clear local files after upload
    setUploadedPhotoUrls(photoLinks);
    setPhotoFiles([]);
  }

  // --- FIXED DURATION LOGIC (Handles cross-day correctly) ---
  const now = new Date();

  // Full start datetime based on saved date + startTime
  const startDateTime = new Date(`${date}T${startTime}:00`);

  // If current time is earlier than start datetime → activity crossed to next day
  if (now < startDateTime) {
    // Move start one day back
    startDateTime.setDate(startDateTime.getDate() - 1);
  }

  // Duration in hours
  const diffHours =
    (now.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

  setEndTime(now.toTimeString().slice(0, 5));
  setDuration(diffHours.toFixed(2));

  // --- Update location ---
  getLocation();

  const payload = {
    date,
    start_time: startTime,
    end_time: now.toTimeString().slice(0, 5),
    day,
    duration: diffHours.toFixed(2),
    damage_type: damageType,
    equipment_used: equipmentList,
    manpower_involved: manpowerList,
    excavation: excavation || null,
    sand: sand || null,
    aggregate: aggregate || null,
    premix: premix || null,
    pipe_usage: pipeUsage || null,
    fittings,
    remarks,
    end_latitude: latitude,
    end_longitude: longitude,
    end_gmap_link: gmapLink,
    photo_link: photoLinks,
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
    toast.error("Failed to submit report. Check console.");
    return;
  }

  toast.success(`Report for ${activityId} submitted successfully!`);
  setIsOngoing(false);
  setSelectedActivity(null);
  setPhotoFiles([]);
  fetchStartedActivities();
};


  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto">
        <header className="mb-12 pt-2 pb-4 border-b-2 border-gray-300">
          <h1 className="text-2xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
            Report Submission
          </h1>
          <p className="text-gray-500 mt-2 italic text-lg">
            Start activity or select a started activity to complete the report.
          </p>
        </header>

        {startedActivities.length > 0 && !selectedActivity && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-blue-700 mb-4">Started Activities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {startedActivities.map((act, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-2xl shadow-md p-4 hover:shadow-xl transition cursor-pointer"
                  onClick={() => selectActivity(act)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-blue-600">{act.activity_id}</span>
                    <span className="text-sm text-gray-500">{act.start_time}</span>
                  </div>
                  {act.damage_type && (
                    <p className="text-gray-700 text-sm mb-2">
                      <span className="font-medium">Damage:</span> {act.damage_type}
                    </p>
                  )}
                  {act.start_gmap_link && (
                    <a
                      href={act.start_gmap_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 text-sm hover:underline truncate block"
                    >
                      View Location
                    </a>
                  )}
                  <div className="mt-2 text-right">
                    <button className="text-white bg-blue-600 px-3 py-1 rounded-xl text-sm hover:bg-blue-700 transition">
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-8 lg:col-span-2">
            <div className="bg-white shadow-xl rounded-3xl p-6 border border-gray-100 space-y-6">
              <h2 className="flex items-center text-xl font-semibold text-blue-700 border-b pb-2">
                <MapPin className="w-5 h-5 mr-2" /> Activity & Location Details
              </h2>
              <FormInput label="Activity ID" placeholder="Enter Activity ID" value={activityId} onChange={(e) => setActivityId(e.target.value)} />
              <div className="space-y-4">
                <div className="hidden">
  <FormInput label="Latitude" placeholder="Latitude" value={latitude ?? ""} readOnly />
  <FormInput label="Longitude" placeholder="Longitude" value={longitude ?? ""} readOnly />
  <FormInput label="Google Maps Link" placeholder="Link" value={gmapLink} readOnly />
</div>

                
                {!selectedActivity && (
                  <button
                    onClick={startActivity}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl"
                    disabled={isOngoing}
                  >
                    Start Activity
                  </button>
                )}
              </div>
            </div>

            {selectedActivity && (
              <div className="bg-white shadow-xl rounded-3xl p-6 border border-gray-100 space-y-6">
                <h2 className="flex items-center text-xl font-semibold text-green-700 border-b pb-2">
                  <Calendar className="w-5 h-5 mr-2" /> Timing & Outcome
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <FormInput label="Date" type="date" placeholder="DD/MM/YYYY" value={date} onChange={(e) => setDate(e.target.value)} readOnly />
                  <FormInput label="Start Time" placeholder="Auto" value={startTime} readOnly />
                  <FormInput label="End Time" placeholder="Auto" value={endTime} readOnly />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormInput label="Day" placeholder="Auto-calculated" value={day} readOnly />
                  <FormInput label="Duration (Hours)" placeholder="Auto-calculated" value={duration} readOnly />
                </div>
                <hr className="border-gray-100 pt-3" />
                <FormInput label="Damage Type" placeholder="e.g., Burst Pipe" value={damageType} onChange={(e) => setDamageType(e.target.value)} />
              </div>
            )}
          </div>

          {selectedActivity && (
            <div className="space-y-8 lg:col-span-1">
              <div className="bg-white shadow-xl rounded-3xl p-6 border border-gray-100 space-y-6">
                <h2 className="flex items-center text-xl font-semibold text-purple-700 border-b pb-2">
                  <Briefcase className="w-5 h-5 mr-2" /> Resources & Materials
                </h2>

                <ListInput label="Equipment Used" items={equipmentList} setItems={setEquipmentList} placeholder="Add equipment" />
                <ListInput label="Manpower Involved" items={manpowerList} setItems={setManpowerList} placeholder="Add manpower" />
                <FormInput label="Excavation (m³)" placeholder="Excavation quantity" value={excavation} onChange={(e) => setExcavation(e.target.value)} />
                <FormInput label="Sand (m³)" placeholder="Sand quantity" value={sand} onChange={(e) => setSand(e.target.value)} />
                <FormInput label="Aggregate (m³)" placeholder="Aggregate quantity" value={aggregate} onChange={(e) => setAggregate(e.target.value)} />
                <FormInput label="Premix (m³)" placeholder="Premix quantity" value={premix} onChange={(e) => setPremix(e.target.value)} />
                <FormInput label="Pipe Usage (m)" placeholder="Pipe usage" value={pipeUsage} onChange={(e) => setPipeUsage(e.target.value)} />
                <FormInput label="Fittings" placeholder="Fittings" value={fittings} onChange={(e) => setFittings(e.target.value)} />
                <FormTextarea label="Remarks" placeholder="Any remarks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />

                {/* Photo Upload */}
                <div className="mt-4">
  <label className="text-base font-semibold text-gray-800 mb-2 block">
    📸 Attach Photos & Evidence
  </label>
  
  {/* --- 1. Custom File Input / Dropzone --- */}
  <label htmlFor="file-upload" className="block cursor-pointer mb-4">
    <div className="flex items-center justify-center h-20 border-2 border-dashed border-indigo-400 rounded-xl p-4 bg-indigo-50/70 hover:bg-indigo-100 transition-all duration-200 group">
      <div className="flex items-center space-x-3 text-center">
        <Camera className="w-5 h-5 text-indigo-600 group-hover:text-indigo-700 transition-colors" />
        <p className="text-sm font-semibold text-indigo-700">
          Tap here to select images
        </p>
        <p className="text-xs text-gray-500 hidden sm:block">
          (Multiple files | Accepts image/*)
        </p>
      </div>
    </div>
  </label>

  {/* Hidden native input */}
  <input
    id="file-upload"
    type="file"
    accept="image/*"
    multiple
    capture="environment"
    onChange={(e) => {
      const files = e.target.files;
      if (!files) return;
      setPhotoFiles((prevFiles) => [...prevFiles, ...Array.from(files)]);
    }}
    className="sr-only" 
  />

  {/* --- 2. Photo Previews & Management --- */}
  {(photoFiles.length > 0 || uploadedPhotoUrls.length > 0) && (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <p className="text-sm font-medium text-gray-600 mb-2">
        {photoFiles.length + uploadedPhotoUrls.length} File(s) Attached:
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        
        {/* Already Uploaded Photos (Read-only view) */}
        {uploadedPhotoUrls.map((url, idx) => (
          <div 
            key={`uploaded-${idx}`} 
            className="relative overflow-hidden group border border-gray-200 rounded-lg shadow-md"
          >
            <img 
              src={url} 
              alt={`uploaded-${idx}`} 
              className="w-full h-24 object-cover transition-transform duration-300 group-hover:scale-105" 
            />
            {/* Optional: Add a subtle overlay for previously uploaded files */}
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                <span className="text-white text-xs font-bold bg-green-600 px-2 py-0.5 rounded">Uploaded</span>
            </div>
            {/* If you need a delete for uploaded, you'd add a button here, but typically this state is read-only */}
          </div>
        ))}

        {/* Newly Selected Files (Pending Upload) */}
        {photoFiles.map((file, idx) => (
          <div 
            key={`file-${idx}`} 
            className="relative overflow-hidden group border-2 border-indigo-400 rounded-lg shadow-lg"
            title={file.name}
          >
            <img 
              src={URL.createObjectURL(file)} 
              alt={`upload-${idx}`} 
              className="w-full h-24 object-cover opacity-80 transition-transform duration-300 group-hover:scale-105" 
            />
            
            {/* Status Badge */}
            <div className="absolute top-0 left-0 bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-br-lg">
                Pending...
            </div>
            
            {/* Removal Button - Improved design */}
            <button
              type="button"
              onClick={() => {
                const newFiles = [...photoFiles];
                newFiles.splice(idx, 1);
                setPhotoFiles(newFiles);
              }}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 shadow-md transition-all duration-200 opacity-90 hover:opacity-100 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Remove file"
            >
              <Trash2 className="w-4 h-4" /> {/* Using Trash icon for removal */}
            </button>
          </div>
        ))}
      </div>
    </div>
  )}
</div>

                <button
                  onClick={handleSubmit}
                  className="w-full mt-4 py-3 px-6 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition"
                >
                  Submit Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
