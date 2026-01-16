import { useState, ChangeEvent, useEffect } from "react";
import toast from "../utils/toast";
import { MapPin, Calendar, Briefcase, Camera, X, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import imageCompression from 'browser-image-compression';

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

  const safeItems = Array.isArray(items) ? items : [];

  const addItem = () => {
    if (!inputValue.trim()) return;
    setItems([...safeItems, inputValue.trim()]);
    setInputValue("");
  };

  const removeItem = (index: number) => {
    const newItems = [...safeItems];
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
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button type="button" onClick={addItem} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition">
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
  
  // Pending inputs for lists
  const [equipmentInput, setEquipmentInput] = useState("");
  const [manpowerInput, setManpowerInput] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gmapLink, setGmapLink] = useState("");
  const [isOngoing, setIsOngoing] = useState(false);
  const [startedActivities, setStartedActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const username = getCookie("username") || "Unknown";

  useEffect(() => {
    if (date) {
      const d = new Date(date);
      const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
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
      const startDateTime = new Date(`${date}T${startTime}:00`);

      if (isNaN(startDateTime.getTime())) {
        startDateTime.setTime(now.getTime()); 
      }
      if (now < startDateTime) {
        startDateTime.setDate(startDateTime.getDate() - 1);
      }
      let diffHours = (now.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
      if (isNaN(diffHours) || diffHours < 0.05) {
        diffHours = 0.05;
      }
      const finalDurationStr = diffHours.toFixed(2);

      // --- Update location ---
      getLocation(); // Try to update location for draft

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

      const payload = {
        date,
        start_time: startTime,
        // end_time: now.toTimeString().slice(0, 5), // Maybe don't set end_time for draft? Or set it? Let's update it as "current progress"
        end_time: now.toTimeString().slice(0, 5),
        day,
        duration: finalDurationStr,
        damage_type: damageType,
        equipment_used: finalEquipmentList,
        manpower_involved: finalManpowerList,
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

    // --- FIXED DURATION LOGIC (Handles cross-day correctly) ---
    const now = new Date();
    // Validate date and startTime presence
    if (!date || !startTime) {
       console.error("Missing Date or StartTime", date, startTime);
       toast.error("Invalid Activity Start Time. Please restart activity.");
       setIsSubmitting(false);
       return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);

    if (isNaN(startDateTime.getTime())) {
      console.error("Invalid Start Date/Time", date, startTime);
      // Fallback or error - deciding to set to now so duration is minimal
      startDateTime.setTime(now.getTime()); 
    }

    // If current time is earlier than start datetime → activity crossed to next day
    if (now < startDateTime) {
      startDateTime.setDate(startDateTime.getDate() - 1);
    }

    let diffHours = (now.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

    // Enforce minimum duration of 0.05 hours (3 mins)
    if (isNaN(diffHours) || diffHours < 0.05) {
      diffHours = 0.05;
    }

    const finalDurationStr = diffHours.toFixed(2);

    setEndTime(now.toTimeString().slice(0, 5));
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

    const payload = {
      date,
      start_time: startTime,
      end_time: now.toTimeString().slice(0, 5),
      day,
      duration: finalDurationStr,
      damage_type: damageType,
      equipment_used: finalEquipmentList,
      manpower_involved: finalManpowerList,
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{act.start_time}</span>
                      <button 
                        onClick={(e) => deleteActivity(e, act.activity_id)}
                        className="p-1 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Cancel/Delete Activity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
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
  <FormInput label="Google Maps Link" placeholder="Link" value={gmapLink ?? ""} readOnly />
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
                  <FormInput label="Date" type="date" placeholder="DD/MM/YYYY" value={date ?? ""} onChange={(e) => setDate(e.target.value)} readOnly />
                  <FormInput label="Start Time" placeholder="Auto" value={startTime ?? ""} readOnly />
                  <FormInput label="End Time" placeholder="Auto" value={endTime ?? ""} readOnly />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormInput label="Day" placeholder="Auto-calculated" value={day ?? ""} readOnly />
                  <FormInput label="Duration (Hours)" placeholder="Auto-calculated" value={duration ?? ""} readOnly />
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

                <ListInput 
                  label="Equipment Used" 
                  items={equipmentList} 
                  setItems={setEquipmentList} 
                  placeholder="Add equipment" 
                  inputValue={equipmentInput}
                  setInputValue={setEquipmentInput}
                />
                <ListInput 
                  label="Manpower Involved" 
                  items={manpowerList} 
                  setItems={setManpowerList} 
                  placeholder="Add manpower" 
                  inputValue={manpowerInput}
                  setInputValue={setManpowerInput}
                />
                <FormInput label="Excavation (m³)" type="number" placeholder="Excavation quantity" value={excavation ?? ""} onChange={(e) => setExcavation(e.target.value)} />
                <FormInput label="Sand (m³)" type="number" placeholder="Sand quantity" value={sand ?? ""} onChange={(e) => setSand(e.target.value)} />
                <FormInput label="Aggregate (m³)" type="number" placeholder="Aggregate quantity" value={aggregate ?? ""} onChange={(e) => setAggregate(e.target.value)} />
                <FormInput label="Premix (m³)" type="number" placeholder="Premix quantity" value={premix ?? ""} onChange={(e) => setPremix(e.target.value)} />
                <FormInput label="Pipe Usage (m)" type="number" placeholder="Pipe usage" value={pipeUsage ?? ""} onChange={(e) => setPipeUsage(e.target.value)} />
                <FormInput label="Fittings" placeholder="Fittings" value={fittings ?? ""} onChange={(e) => setFittings(e.target.value)} />
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
  accept="image/*,video/*"
  multiple
  capture="environment"
  onChange={handleFileSelect} // ← use the new handler
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
        {/* Newly Selected Files (Pending Upload) */}
{photoFiles.map((file, idx) => {
  const isVideo = file.type.startsWith('video/');
  const fileUrl = URL.createObjectURL(file);

  return (
    <div
      key={`file-${idx}`}
      className="relative overflow-hidden group border-2 border-indigo-400 rounded-lg shadow-lg"
      title={file.name}
    >
      {isVideo ? (
        <div className="w-full h-24 bg-gray-800 flex items-center justify-center relative">
          <video
            src={fileUrl}
            className="w-full h-full object-cover opacity-90"
            muted
            playsInline
            poster="" // optional: add a poster later if needed
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play className="w-6 h-6 text-white" /> {/* You'll need to import Play */}
          </div>
        </div>
      ) : (
        <img
          src={fileUrl}
          alt={`upload-${idx}`}
          className="w-full h-24 object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
        />
      )}

      <div className="absolute top-0 left-0 bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-br-lg">
        {isVideo ? 'Video' : 'Image'}
      </div>

      <button
        type="button"
        onClick={() => {
          const newFiles = [...photoFiles];
          newFiles.splice(idx, 1);
          setPhotoFiles(newFiles);
          URL.revokeObjectURL(fileUrl); // Clean up memory
        }}
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 shadow-md transition-all duration-200 opacity-90 hover:opacity-100 hover:bg-red-700"
        title="Remove file"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
})}
      </div>
    </div>
  )}
</div>

                <button
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className={`w-full mb-3 py-3 px-6 text-blue-700 font-semibold rounded-xl border-2 border-blue-600 hover:bg-blue-50 transition flex items-center justify-center ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                   Save Draft
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`w-full mt-4 py-3 px-6 text-white font-semibold rounded-xl transition flex items-center justify-center ${
                    isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </button>
              </div>
            </div>
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
