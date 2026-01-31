import { useEffect, useState, MouseEventHandler } from "react";
import { MapPin, Calendar, Hash, Layers, X, FolderOpen, Loader, Check, XCircle, Edit3, Loader2, Clock, Download, UserPlus, Play, ChevronUp, ChevronDown } from 'lucide-react';
import toast from "../utils/toast";
import { supabase } from "../supabase";
import DimensionInput, { Dimensions } from '../components/DimensionInput';

// --- Supabase REST API Config from .env ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const headers = {
  "apikey": supabaseKey,
  "Authorization": `Bearer ${supabaseKey}`,
  "Content-Type": "application/json",
};

// --- Report Data Interface (ALL nullable fields explicitly include `| null`) ---
interface Report {
  id: number;
  activity_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  day: string;
  duration: number; // Required number
  damage_type: string;
  equipment_used: string;
  manpower_involved: string;
  
  // These optional fields must allow `null` from the database and during save.
  // Changed to 'any' to support Dimensions object { length, width, depth } or legacy numbers
  excavation?: any;
  sand?: any;
  aggregate?: any;
  premix?: any;
  cement?: any;
  pipe_usage?: number | null;
  
  fittings?: any; // Changed to any to support string[] or string
  remarks?: string | null;
  
  start_latitude?: number | null;
  start_longitude?: number | null;
  
  start_gmap_link: string;

  end_latitude?: number | null;
  end_longitude?: number | null;
  
  end_gmap_link: string;
  status: string;
  created_at: string;
  submitted_by: string;

   photo_link?: string[] | null;
}

// Maintenance categories with English/Malay labels
const MAINTENANCE_CATEGORIES = [
  { key: 'wakil_syabas', label: 'wakil syabas di tapak / Representative at Site' },
  { key: 'penyediaan_peralatan', label: 'penyediaan peralatan keselamatan / Safety Equipment Preparation' },
  { key: 'lokasi_kebocoran', label: 'lokasi kebocoran / Leak Location' },
  { key: 'pemotongan_jalan', label: 'kerja-kerja pemotongan jalan / Road Cutting Works' },
  { key: 'pengorekan', label: 'kerja-kerja pengorekan / Excavation Works' },
  { key: 'pembaikan1', label: 'kerja-kerja pembaikan / Repair Works' },
  { key: 'barangan_rosak', label: 'barangan rosak/lama / Damaged/Old Items' },
  { key: 'barangan_ganti', label: 'barangan yang akan diganti / Items to be Replaced' },
  { key: 'masukkan_pasir', label: 'kerja memasukkan pasir / Sand Filling Works' },
  { key: 'mampatan_pasir', label: 'kerja-kerja mampatan pasir lapisan pertama / First Layer Sand Compaction Works' },
  { key: 'mampatan_batu', label: 'kerja-kerja mampatan batu pecah / Aggregate Compaction Works' },
  { key: 'pembaikan2', label: 'kerja-kerja pembaikan / Repair Works' },
  { key: 'siap_sepenuhnya', label: 'kerja telah siap sepenuhnya / Work Fully Completed' },
  { key: 'gambar_papan_putih', label: 'Gambar papan putih / Whiteboard Picture' },
  { key: 'gambar_pengesahan', label: 'gambar pengesahan tapak / Site Confirmation Picture' },
  { key: 'gambar_point_bocor_pembaikan', label: 'Gambar point bocor untuk kerja pembaikan / Leak Point Picture for Repair Work' },
  { key: 'gambar_point_bocor_sudah', label: 'gambar point bocor yang telah pembaikan / Leak Point Picture After Repair' },
  { key: 'gambar_barang_lama', label: 'gambar barang lama yang telah rosak / Picture of Old Damaged Items' },
  { key: 'gambar_barang_baru', label: 'gambar barang baru yang telah ditukar / Picture of New Replaced Items' },
];

// Premix categories with English/Malay labels
const PREMIX_CATEGORIES = [
  { key: 'kedalaman_keseluruhan', label: 'gambar kedalaman keseluruhan / Overall Depth Picture' },
  { key: 'kedalaman_premix_kedua', label: 'gambar kedalaman premix lapisan kedua / Second Layer Premix Depth Picture' },
  { key: 'tack_coat_pertama', label: 'gambar meletakkan tack coat lapisan pertama / First Layer Tack Coat Placement Picture' },
  { key: 'mampatan_premix_pertama', label: 'kerja-kerja mampatan premix lapisan pertama / First Layer Premix Compaction Works' },
  { key: 'tack_coat_kedua', label: 'gambar meletakkan tack coat lapisan kedua / Second Layer Tack Coat Placement Picture' },
  { key: 'mampatan_premix_kedua', label: 'kerja-kerja mampatan premix lapisan kedua / Second Layer Premix Compaction Works' },
  { key: 'keluasan_turapan', label: 'gambar keluasan turapan / Pavement Area Picture' },
  { key: 'kerja_turapan_siap', label: 'gambar kerja turapan siap / Finished Pavement Work Picture' },
  { key: 'pengesahan_tapak', label: 'gambar pengesahan tapak / Site Confirmation Picture' },
  { key: 'ukuran_premix', label: 'gambar ukuran premix / Premix Size Picture' },
  { key: 'label_premix', label: 'gambar label premix / Premix Label Picture' },
];

// ====================================================================
// --- 1. ReportDetailsModal Component ---
// ====================================================================
interface ModalProps {
  report: Report;
  onClose: () => void;
  onUpdate: (updated: Report | null) => void; // allow null when deleted
}

const ReportDetailsModal = ({ report, onClose, onUpdate }: ModalProps) => {
  const [reports, setReports] = useState<Report[]>([report]);
  const [activeReportIdx, setActiveReportIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [supervisors, setSupervisors] = useState<{ id: number; username: string }[]>([]);
  const [showAddSupervisor, setShowAddSupervisor] = useState(false);
  const [activeTab, setActiveTab] = useState<'Report' | 'Maintenance' | 'Premix'>('Report');

  // Helper to parse potential string or object dimensions (Copied from ReportSubmission)
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
            } catch(e) { /* Ignore */ }

          // Fallback to "LxWxD" string parsing (legacy)
          const parts = val.toLowerCase().split('x');
          return {
              length: parts[0] || "",
              width: parts[1] || "",
              depth: parts[2] || ""
          };
      }
      // If it's a number (legacy data), maybe treat as length? or just return null?
      // Let's assume null for strict "L x W x D" requirement, or put in length if needed.
      return null; 
  };


  // Use the currently active report for display/editing
  const activeReport = reports[activeReportIdx] || report;

  const [editableReport, setEditableReport] = useState<Report>({ ...activeReport });
  const [saving, setSaving] = useState(false);

  // --- Fetch all reports for this activity ID (grouped by grouping logic) ---
  const fetchActivityReports = async () => {
    setLoading(true);
    try {
      // Logic: If current ID is "12345-1", base is "12345". If "12345", base is "12345".
      const currentIdStr = report.activity_id.toString();
      const baseId = currentIdStr.includes('-') ? currentIdStr.split('-')[0] : currentIdStr;

      // Query: specific ID OR ID like baseId-%
      // Supabase filter syntax for OR: or=(col.eq.val,col.like.val)
      // Note: We used * for wildcard before? No, PostgREST uses % (SQL standard). 
      // But in URL params, % must be encoded as %25.
      const query = `or=(activity_id.eq.${baseId},activity_id.like.${baseId}-%25)`;

      const res = await fetch(`${supabaseUrl}/rest/v1/reports?${query}&select=*&order=id.asc`, { headers });
      if (!res.ok) throw new Error("Failed to fetch activity reports");
      const data: Report[] = await res.json();
      setReports(data);
       
      // Reset editable to current active
      // Find the one that matches the original passed 'report.id' if possible, or just stay at 0
      const currentId = activeReport.id; 
      const newIdx = data.findIndex(r => r.id === currentId);
      if (newIdx !== -1) setActiveReportIdx(newIdx);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load all reports for this activity.");
    }
    setLoading(false);
  };

  // --- Fetch Supervisors for Dropdown ---
  const fetchSupervisors = async () => {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/adiav?role=eq.supervisor&select=id,username`, { headers });
      if (!res.ok) throw new Error("Failed to fetch supervisors");
      const data = await res.json();
      setSupervisors(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActivityReports();
    fetchSupervisors();
  }, [report.activity_id]);

  useEffect(() => {
    // When switching tabs, update the editable state
    // We need to ensure complex fields (dimensions) are parsed correctly for the UI
    const current = reports[activeReportIdx] || report;
    setEditableReport({ 
        ...current,
        excavation: parseDimensions(current.excavation),
        sand: parseDimensions(current.sand),
        aggregate: parseDimensions(current.aggregate),
        premix: parseDimensions(current.premix),
        cement: parseDimensions(current.cement),
        // Fittings might be string list or string
        fittings: Array.isArray(current.fittings) ? current.fittings.join(', ') : (current.fittings || "")
    });
  }, [activeReportIdx, reports]);

  const handleAddSupervisor = async (username: string) => {
     if (!confirm(`Assign ${username} to this activity?`)) return;
     setSaving(true);
     try {
        // Use Malaysia time zone
        
       

        
       

  
         // Logic to calculate next suffix
         // Get base ID
         const currentIdStr = report.activity_id.toString();
         const baseId = currentIdStr.includes('-') ? currentIdStr.split('-')[0] : currentIdStr;
         
         // Find highest suffix in existing reports for this base
         let maxSuffix = 0;
         reports.forEach(r => {
             const rId = r.activity_id.toString();
             if (rId.startsWith(baseId + '-')) {
                 const suffixPart = rId.split(baseId + '-')[1];
                 const suffix = parseInt(suffixPart, 10);
                 if (!isNaN(suffix) && suffix > maxSuffix) {
                     maxSuffix = suffix;
                 }
             }
         });
         
         const newActivityId = `${baseId}-${maxSuffix + 1}`;

         const payload = {
            activity_id: newActivityId,
            
            start_time: null, // Clear start time, waiting for them to start, use NULL not empty string
           
            status: 'Assigned', // Changed from 'Started'
            submitted_by: username,
            
            // Copy details from the currently active report to provide context
            damage_type: activeReport.damage_type,
            
           

            // Also copy end location if available, though usually this is for them to fill
            // Validated requirement: "copy the report" so context is preserved.
            end_latitude: activeReport.end_latitude,
            end_longitude: activeReport.end_longitude,
            end_gmap_link: activeReport.end_gmap_link,

            duration: 0
         };

        const res = await fetch(`${supabaseUrl}/rest/v1/reports`, { 
            method: 'POST', 
            headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Failed to add supervisor");

        toast.success(`Supervisor ${username} added!`);
        setShowAddSupervisor(false);
        fetchActivityReports(); // Reload tabs

     } catch(e) {
        console.error(e);
        toast.error("Failed to add supervisor.");
     } finally {
        setSaving(false);
     }
  };


  const optionalNullableStringFields: (keyof Report)[] = ['fittings', 'remarks'];

  const handleChange = (field: keyof Report, value: any) => {
    let finalValue: any = value;
    
    // Logic for optional number fields (only pipe_usage remains a simple number)
    if (field === 'pipe_usage' && typeof value === 'string') {
      const numValue = Number(value);
      finalValue = value.trim() === '' || isNaN(numValue) ? undefined : numValue;
    }
    
    // Logic for optional string fields
    if (typeof value === 'string' && optionalNullableStringFields.includes(field)) {
        finalValue = value.trim() === '' ? undefined : value;
    }
    
    setEditableReport(prev => ({ ...prev, [field]: finalValue } as any));
  };

  const handleDimensionChange = (field: keyof Report, val: Dimensions) => {
      setEditableReport(prev => ({ ...prev, [field]: val }));
  };



  // const handleDelete ... (Updated to handle deleting specific report from tab)
  const handleDelete = async (reportId?: number) => {
    // If no specific ID passed, use current (fallback for main delete button)
    const targetId = reportId ?? reports[activeReportIdx].id;
    const isCurrentActive = targetId === reports[activeReportIdx].id;

    // Use custom toast confirmation
    const confirmed = await toast.confirm("Are you sure you want to delete this report?");
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${targetId}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) throw new Error("Failed to delete report");

      toast.success("Report deleted successfully!");
      
      // If it was the last report, close modal
      if (reports.length <= 1) {
          onUpdate(null);
          onClose();
          window.location.reload();
      } else {
          // If we deleted the currently active report, switch to another one
          if (isCurrentActive) {
              const deletedIdx = reports.findIndex(r => r.id === targetId);
              // Try to go to previous, or 0 if we were at 0
              const nextIdx = deletedIdx > 0 ? deletedIdx - 1 : 0;
              // We can't set activeReportIdx immediately to a safe value because reports state is old
              // But fetchActivityReports will refresh content. 
              // However, we should be careful about the momentary 404 or index out of bounds.
              // Let's rely on fetchActivityReports logic (it handles some index drift) 
              // BUT we should probably anticipate the shift.
              setActiveReportIdx(Math.max(0, nextIdx));
          }
          // Reload tabs
          fetchActivityReports();
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to delete report.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const currentReport = reports[activeReportIdx];
    setSaving(true);
    try {
      const updates: { [key: string]: any } = {};

      (Object.keys(editableReport) as (keyof Report)[]).forEach(key => {
        // Special check for fittings string -> array conversion if needed
        if (key === 'fittings' && typeof editableReport.fittings === 'string') {
             // If original was array, we need to compare properly? 
             // Simplest is to just split and save if it changed.
             // But here we just compare standard equality which might fail for objects
        }

        if (JSON.stringify(editableReport[key]) !== JSON.stringify(currentReport[key])) {
             let val = editableReport[key];
             
             // Convert fittings string back to array if it's a string
             if (key === 'fittings' && typeof val === 'string') {
                 val = val.split(',').map(s => s.trim()).filter(s => s);
             }

             updates[key] = val === undefined ? null : val;
        }
      });
      
      const res = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${currentReport.id}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Prefer": "return=representation" 
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update report");

      toast.success("Changes saved successfully!");
      fetchActivityReports(); // Refresh tabs data

    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes.");
    }
    setSaving(false);
  };

  const handleStatusChange = async (status: "Approved" | "Rejected") => {
    const currentReport = reports[activeReportIdx];
    setSaving(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${currentReport.id}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Prefer": "return=representation"
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      
      toast.success(`Report ${status} successfully!`);
      // Update local state without full reload if possible, but fetching is safer
      fetchActivityReports(); 

    } catch (err) {
      console.error(err);
      toast.error("Failed to change status.");
    }
    setSaving(false);
  };

  // Parse photos logic
  let maintenancePhotosData: Record<string, string[]> = {};
  let premixPhotosData: Record<string, string[]> = {};

  const currentReportDisplay = reports[activeReportIdx] || report;

  if (currentReportDisplay.photo_link && currentReportDisplay.photo_link.length > 0) {
      // Check if first item is JSON string
      if (currentReportDisplay.photo_link[0].trim().startsWith('{') || currentReportDisplay.photo_link[0].trim().startsWith('[')) {
          try {
              const parsed = JSON.parse(currentReportDisplay.photo_link[0]);
              // It could be our new structure { maintenance: ..., premix: ... }
              if (parsed.maintenance || parsed.premix) {
                  if (parsed.maintenance) maintenancePhotosData = parsed.maintenance;
                  if (parsed.premix) premixPhotosData = parsed.premix;
              } else {
                 // Or it could be legacy JSON array? 
                 // If parsed is array, it might be list of strings?
                 // But wait, postgres text[] column, supabase returns array of strings.
                 // If the USER pushed [JSON.stringify(data)], then report.photo_link is [\"{...}\"]
                 // Correct to parse report.photo_link[0]
              }
          } catch (e) {
              // Not JSON, assume regular URLs
          }
      } else {
          // Plain strings
      }
  }

  // Modern input styling
  const inputStyle = "w-full border border-gray-300 p-2 rounded-lg text-sm transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";
  const labelStyle = "text-xs font-semibold text-gray-600 mb-1 block";

  // Section title style
  const sectionHeaderStyle = "text-xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center";
  const iconStyle = "w-5 h-5 mr-2 text-indigo-500";


  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto transform transition duration-300">
        
        {/* Header */}
        {/* Header */}
        <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 flex items-center">
                <FolderOpen className="w-6 h-6 mr-3 text-indigo-600" />
                <span className="truncate">Report Review: {report.activity_id}</span>
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-2">
                {reports.map((r, i) => (
                    <div key={r.id} className="relative group">
                        <button
                            onClick={() => setActiveReportIdx(i)}
                            className={`px-3 py-1 pr-6 rounded-full text-sm font-medium transition ${
                                i === activeReportIdx 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {r.submitted_by} 
                            <span className={`ml-2 text-xs opacity-75 ${
                                r.status === 'Approved' ? (i === activeReportIdx ? 'text-green-300' : 'text-green-600') :
                                r.status === 'Rejected' ? (i === activeReportIdx ? 'text-red-300' : 'text-red-600') : ''
                            }`}>({r.status})</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(r.id);
                            }}
                            className={`absolute top-0 right-0 -mr-1 -mt-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50`}
                            title="Remove Report"
                        >
                            <XCircle className="w-4 h-4 text-red-500" />
                        </button>
                    </div>
                ))}
                
                {/* Add Supervisor Button */}
                <div className="relative">
                    <button 
                        onClick={() => setShowAddSupervisor(!showAddSupervisor)}
                        className="px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 flex items-center text-sm"
                        title="Add Supervisor"
                    >
                        <UserPlus className="w-4 h-4 mr-1"/> Add
                    </button>
                    
                    {showAddSupervisor && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-lg z-50 py-1">
                            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Assign Supervisor</p>
                            {supervisors
                                .filter(s => !reports.map(r => r.submitted_by).includes(s.username)) // Exclude existing
                                .map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleAddSupervisor(s.username)}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 bg-white"
                                >
                                    {s.username}
                                </button>
                            ))}
                            {supervisors.filter(s => !reports.map(r => r.submitted_by).includes(s.username)).length === 0 && (
                                <p className="px-4 py-2 text-sm text-gray-400 italic">No other supervisors.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-900 p-2 rounded-full transition hover:bg-gray-100 self-start"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8"/></div>
        ) : (
        <div className="p-8 space-y-8">
          
          {/* Status Badge & Tabs */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
             {/* Tabs */}
             <div className="flex bg-gray-100 p-1 rounded-lg">
                {(['Report', 'Maintenance', 'Premix'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                            activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
             </div>
             
             <span className={`inline-flex items-center px-4 py-1.5 text-sm font-semibold rounded-full ${
              editableReport.status === 'Approved' ? 'bg-green-100 text-green-700' :
              editableReport.status === 'Rejected' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {editableReport.status}
            </span>
          </div>

        {/* TAB CONTENT: REPORT */}
        {activeTab === 'Report' && (
          <div className="space-y-8 animate-fade-in">

          {/* Timing & Location */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner">
            <h3 className={sectionHeaderStyle}><Calendar className={iconStyle} /> Activity and Timing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className={labelStyle}>Date / Day</label>
                <p className="text-gray-800 font-medium">{editableReport.date} ({editableReport.day})</p>
              </div>
              <div>
                <label className={labelStyle}>Time</label>
                <p className="text-gray-800 font-medium">{editableReport.start_time} - {editableReport.end_time}</p>
              </div>
              <div>
                <label className={labelStyle}>Duration (mins)</label>
                <p className="text-gray-800 font-medium">{editableReport.duration} mins</p>
              </div>
            </div>
            
            <div className="mt-6">
              <label className={labelStyle}>Damage Type</label>
              <input 
                type="text" 
                value={editableReport.damage_type} 
                onChange={(e) => handleChange("damage_type", e.target.value)} 
                className={inputStyle}
              />
            </div>
            <p className="mt-4 text-sm text-gray-600 flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-red-500" />
              Start Activity Location : {editableReport.start_latitude ?? "N/A"}, {editableReport.start_longitude ?? "N/A"}
              {editableReport.start_gmap_link && <a className="text-indigo-600 hover:text-indigo-800 underline ml-2" href={editableReport.start_gmap_link} target="_blank" rel="noopener noreferrer">View on Map</a>}
            </p>
            <p className="mt-4 text-sm text-gray-600 flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-red-500" />
              Final Report Location : {editableReport.end_latitude ?? "N/A"}, {editableReport.end_longitude ?? "N/A"}
              {editableReport.end_gmap_link && <a className="text-indigo-600 hover:text-indigo-800 underline ml-2" href={editableReport.end_gmap_link} target="_blank" rel="noopener noreferrer">View on Map</a>}
            </p>
          </section>

          {/* Resources & Manpower */}
          <section className="space-y-4 pt-4">
            <h3 className={sectionHeaderStyle}><Layers className={iconStyle} /> Resources & Manpower</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>Equipment Used</label>
                <input type="text" value={editableReport.equipment_used} onChange={(e) => handleChange("equipment_used", e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Manpower Involved</label>
                <input type="text" value={editableReport.manpower_involved} onChange={(e) => handleChange("manpower_involved", e.target.value)} className={inputStyle} />
              </div>
            </div>
          </section>

          {/* Materials */}
          <section className="space-y-4 pt-4">
            <h3 className={sectionHeaderStyle}><Hash className={iconStyle} /> Materials Quantities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Row 1 */}
                <DimensionInput 
                    label="Excavation (m³)" 
                    value={editableReport.excavation} 
                    onChange={(val) => handleDimensionChange('excavation', val)} 
                />
                <DimensionInput 
                    label="Sand (m³)" 
                    value={editableReport.sand} 
                    onChange={(val) => handleDimensionChange('sand', val)} 
                />
                
                {/* Row 2 */}
                <DimensionInput 
                    label="Aggregate (m³)" 
                    value={editableReport.aggregate} 
                    onChange={(val) => handleDimensionChange('aggregate', val)} 
                />
                <DimensionInput 
                    label="Premix (kg)" 
                    value={editableReport.premix} 
                    onChange={(val) => handleDimensionChange('premix', val)}
                    showDepth={false} 
                />

                {/* Row 3 */}
                <DimensionInput 
                    label="Cement (kg)" 
                    value={editableReport.cement} 
                    onChange={(val) => handleDimensionChange('cement', val)} 
                    showDepth={false} 
                />

                {/* Row 4 */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className={labelStyle}>Pipe Usage (m)</label>
                        <input type="number" value={editableReport.pipe_usage ?? ""} onChange={(e) => handleChange("pipe_usage", e.target.value)} className={inputStyle} />
                    </div>
                    <div className="space-y-1">
                        <label className={labelStyle}>Fittings</label>
                        <input 
                            type="text" 
                            value={typeof editableReport.fittings === 'string' ? editableReport.fittings : (Array.isArray(editableReport.fittings) ? editableReport.fittings.join(', ') : "")} 
                            onChange={(e) => handleChange("fittings", e.target.value)} 
                            className={inputStyle} 
                            placeholder="Comma separated"
                        />
                    </div>
                </div>
            </div>
          </section>

          <p className="text-xl text-gray-500  mt-1">
            Submitted by: <span className="font-medium">{report.submitted_by}</span>
          </p>

         {/* Original Media Attachments 
         {editableReport.photo_link && editableReport.photo_link.length > 0 && (
  <section className="space-y-4 pt-4">
    <h3 className={sectionHeaderStyle}>
      <FolderOpen className={iconStyle} /> General Media Attachments
    </h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {editableReport.photo_link.map((url, idx) => {
      const isVideo = /\.(mp4|mov|avi|wmv|flv|webm|mkv)($|\?)/i.test(url);
                  return (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block group">
                      {isVideo ? (
                        <div className="relative w-full h-32 bg-black rounded-lg border border-gray-200 overflow-hidden">
                          <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                        </div>
                      ) : (
                        <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:shadow-lg transition" loading="lazy" />
                      )}
                    </a>
                  );
                })}
              </div>
            </section>
          )} 
          */}

        </div> // This closes the <div className="space-y-8 animate-fade-in"> for the Report tab
      )}
        {/* TAB CONTENT: MAINTENANCE */}
        {activeTab === 'Maintenance' && (
           <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-bold text-gray-800 flex items-center border-b pb-2">
                 <FolderOpen className="w-5 h-5 mr-2 text-indigo-500" /> Maintenance Photos
              </h3>
              
              {Object.keys(maintenancePhotosData).length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 italic">No categorized maintenance photos found.</p>
                  </div>
              ) : (
                <div className="space-y-8">
                  {/* Iterate categories to keep order */}
                  {MAINTENANCE_CATEGORIES.map(cat => {
                      const photos = maintenancePhotosData[cat.key];
                      if (!photos || photos.length === 0) return null;

                      return (
                          <div key={cat.key} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                              <h4 className="font-semibold text-gray-700 mb-3 border-l-4 border-indigo-500 pl-3">
                                  {cat.label}
                              </h4>
                              <div className="grid grid-cols-1 gap-6">
                                  {photos.map((url, idx) => {
                                     const isVideo = /\.(mp4|mov|avi|wmv|flv|webm|mkv)($|\?)/i.test(url);
                                     return (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block group relative">
                                            {isVideo ? (
                                                <div className="w-full h-64 bg-black rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
                                                    <video src={url} className="w-full h-full object-cover opacity-80" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Play className="w-12 h-12 text-white opacity-80" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <img src={url} alt={cat.label} className="w-full h-64 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition" />
                                            )}
                                        </a>
                                     );
                                  })}
                              </div>
                          </div>
                      );
                  })}
                </div>
              )}
           </div>
        )}

        {/* TAB CONTENT: PREMIX */}
        {activeTab === 'Premix' && (
           <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-bold text-gray-800 flex items-center border-b pb-2">
                 <FolderOpen className="w-5 h-5 mr-2 text-indigo-500" /> Premix Photos
              </h3>
              
              {Object.keys(premixPhotosData).length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 italic">No categorized premix photos found.</p>
                  </div>
              ) : (
                <div className="space-y-8">
                  {/* Iterate categories to keep order */}
                  {PREMIX_CATEGORIES.map(cat => {
                      const photos = premixPhotosData[cat.key];
                      if (!photos || photos.length === 0) return null;

                      return (
                          <div key={cat.key} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                              <h4 className="font-semibold text-gray-700 mb-3 border-l-4 border-indigo-500 pl-3">
                                  {cat.label}
                              </h4>
                              <div className="grid grid-cols-1 gap-6">
                                  {photos.map((url, idx) => {
                                     const isVideo = /\.(mp4|mov|avi|wmv|flv|webm|mkv)($|\?)/i.test(url);
                                     return (
                                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block group relative">
                                            {isVideo ? (
                                                <div className="w-full h-64 bg-black rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
                                                    <video src={url} className="w-full h-full object-cover opacity-80" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Play className="w-12 h-12 text-white opacity-80" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <img src={url} alt={cat.label} className="w-full h-64 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition" />
                                            )}
                                        </a>
                                     );
                                  })}
                              </div>
                          </div>
                      );
                  })}
                </div>
              )}
           </div>
        )}





          {/* Remarks */}
          <section className="space-y-4 pt-4">
            <h3 className={sectionHeaderStyle}><Clock className={iconStyle} /> Final Remarks</h3>
            <textarea 
              value={editableReport.remarks ?? ""} 
              onChange={(e) => handleChange("remarks", e.target.value)} 
              rows={4}
              placeholder="Add any additional remarks, challenges faced, or important observations."
              className={`${inputStyle} resize-y bg-yellow-50 border-yellow-200`}
            />
          </section>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-6">
            <button 
              onClick={() => handleDelete()} 
              disabled={saving}
              className={`flex items-center px-5 py-2.5 rounded-xl transition font-semibold text-white ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-md'}`}
            >
              <XCircle className="w-4 h-4 mr-2" /> Delete
            </button>

            <button 
              onClick={() => handleStatusChange("Rejected")} 
              disabled={saving}
              className={`flex items-center px-5 py-2.5 rounded-xl transition font-semibold text-white ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-md'}`}
            >
              <XCircle className="w-4 h-4 mr-2" /> Reject
            </button>

            <button 
              onClick={() => handleStatusChange("Approved")} 
              disabled={saving}
              className={`flex items-center px-5 py-2.5 rounded-xl transition font-semibold text-white ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md'}`}
            >
              <Check className="w-4 h-4 mr-2" /> Approve
            </button>

            <button 
              onClick={handleSave} 
              disabled={saving}
              className={`flex items-center px-5 py-2.5 rounded-xl transition font-semibold text-white ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg'}`}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit3 className="w-4 h-4 mr-2" />} Save Changes
            </button>
          </div>

        </div>
        )}
      </div>
    </div>
  );
};

// ====================================================================
// --- 2. ReportListItem Component ---
// ====================================================================
interface ListItemProps {
  report: Report;
  onClick: MouseEventHandler<HTMLDivElement>;
  childrenReports?: Report[];
  onChildClick?: (r: Report) => void;
}

const ReportListItem = ({ report, onClick, childrenReports = [], onChildClick }: ListItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusColor = report.status === 'Approved'
    ? 'bg-green-500 text-white'
    : report.status === 'Rejected'
    ? 'bg-red-500 text-white'
    : 'bg-yellow-500 text-gray-900';

  return (
    <div className="flex flex-col space-y-2">
      <div className="bg-white shadow-lg rounded-xl p-5 border border-gray-100 cursor-pointer 
                      hover:shadow-2xl hover:border-indigo-400 transition duration-300 
                      transform hover:-translate-y-1 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 relative"
        onClick={onClick}
      >
        {/* Left: ID, Date, Type */}
        <div className="w-full">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-gray-800 flex items-center">
              <MapPin className="w-5 h-5 mr-3 text-indigo-500" /> 
              {report.activity_id}
            </h3>
            {childrenReports.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="p-1 rounded-full hover:bg-gray-100 transition"
                title={`${childrenReports.length} related reports`}
              >
                {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 ml-8 mt-1">
            <span className="font-semibold">{report.date}</span> &bull; {report.damage_type}
          </p>
          <p className="text-sm text-gray-500 ml-8 mt-1">
             Submitted by: <span className="font-medium">{report.submitted_by}</span>
          </p>
        </div>

        {/* Right: Duration and Status */}
        <div className="w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end gap-2 sm:gap-1 mt-2 sm:mt-0">
          <p className="text-base font-medium text-gray-600 order-1 sm:order-none">
            <span className="block text-xs font-normal text-gray-400 text-left sm:text-right">Duration</span>
            {report.duration} mins
          </p>
          <span className={`inline-block px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-md order-2 sm:order-none ${statusColor}`}>
            {report.status}
          </span>
        </div>
      </div>

      {/* Children Reports Accordion */}
      {isOpen && childrenReports.length > 0 && (
        <div className="pl-6 sm:pl-10 space-y-2 border-l-2 border-indigo-100 ml-4">
           {childrenReports.map(child => (
             <ReportListItem 
                key={child.id} 
                report={child} 
                onClick={() => onChildClick && onChildClick(child)} 
             /> 
           ))}
        </div>
      )}
    </div>
  );
};

// ====================================================================
// --- GROUPING HELPERS ---
// ====================================================================

interface ReportGroup {
  parent: Report;
  children: Report[];
}

const groupReports = (reports: Report[]): ReportGroup[] => {
  const groups: { [baseId: string]: Report[] } = {};
  
  reports.forEach(r => {
    // Logic: Base ID is the part before the first hyphen? 
    // Actually, "1234" is base. "1234-1" is child.
    // Base ID of "1234" is "1234".
    // Base ID of "1234-1" is "1234".
    // We assume activity_id format is "BASE" or "BASE-SUFFIX".
    const baseId = r.activity_id.split('-')[0];
    if (!groups[baseId]) groups[baseId] = [];
    groups[baseId].push(r);
  });

  const reportGroups: ReportGroup[] = [];
  
  Object.keys(groups).forEach(baseId => {
    const list = groups[baseId];
    // Find parent: exact match to baseId?
    const parentIndex = list.findIndex(r => r.activity_id === baseId);
    let parent: Report;
    let children: Report[] = [];

    if (parentIndex !== -1) {
      parent = list[parentIndex];
      children = list.filter((_, idx) => idx !== parentIndex);
    } else {
      // No exact parent match? (Maybe only 1234-1 exists).
      // Treat the first one as parent (or grouped under virtual parent? No report must be real).
      // Let's take the one with shortest ID? or just the first one.
      // Sort by ID length then value.
      list.sort((a, b) => a.activity_id.length - b.activity_id.length || a.activity_id.localeCompare(b.activity_id));
      parent = list[0];
      children = list.slice(1);
    }
    
    // Sort children
    children.sort((a, b) => a.activity_id.localeCompare(b.activity_id));
    
    reportGroups.push({ parent, children });
  });

  // Sort groups by parent date desc (or created_at)
  reportGroups.sort((a, b) => new Date(b.parent.created_at).getTime() - new Date(a.parent.created_at).getTime());

  return reportGroups;
};

const paginateGroups = (groups: ReportGroup[], page: number, limit: number) => {
  return groups.slice((page - 1) * limit, page * limit);
};

// ====================================================================
// --- PAGINATION COMPONENT (MODERN ROUNDED PILLS, CENTERED) ---
// ====================================================================
const PaginationPills = ({
  page,
  total,
  itemsPerPage,
  onChange
}: {
  page: number;
  total: number;
  itemsPerPage: number;
  onChange: (n: number) => void;
}) => {
  const totalPages = Math.ceil(total / itemsPerPage);
  if (totalPages <= 1) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex justify-center mt-4">
      <div className="flex items-center gap-2">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-300 transition"
        >
          &lt;
        </button>

        {pageNumbers.map(num => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={`px-4 py-1 rounded-full text-sm font-semibold transition 
              ${page === num
                ? "bg-indigo-600 text-white shadow"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {num}
          </button>
        ))}

        <button
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-300 transition"
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

// ====================================================================
// --- 3. ReportsListPage Component (Main) ---
// ====================================================================
export default function ReportsListPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState<'Ongoing' | 'Pending' | 'Approved' | 'Rejected'>('Pending');

  const fetchReports = async () => {
    setLoading(true);
    try {
      // 1. Fetch all reports sorted by created_at desc
      const res = await fetch(`${supabaseUrl}/rest/v1/reports?select=*&order=created_at.desc`, { headers });
      if (!res.ok) throw new Error("Failed to fetch");
      const data: Report[] = await res.json();
      
      // Removed unique grouping logic to allow all reports (including suffixed ones) to be loaded.
      // Grouping will be handled at the display level.
      setReports(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch reports");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();

    // Realtime subscription
    const channel = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
        },
        (payload) => {
          console.log('Change received!', payload);
          toast.success("New data received! Refreshing...");
          fetchReports();
        }
      )
      .subscribe();

    // Autorefres 60 seconk
    const intervalId = setInterval(() => {
      fetchReports();
    }, 60000); // 60 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId); // Clear the interval when component unmounts
    };
  }, []);

  const handleReportClick = (report: Report) => setSelectedReport(report);

  const handleUpdateReport = (updated: Report | null) => {
    // if updated is null => remove the report
    if (updated === null) {
      setReports(prev => prev.filter(r => r.id !== (selectedReport ? selectedReport.id : -1)));
      return;
    }
    setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const startedReports = reports.filter(r => r.status === 'Ongoing' || r.status === 'Started' || r.status === 'Assigned');
  const pendingReports = reports.filter(r => r.status === 'Pending' || r.status === 'Processing');
  const approvedReports = reports.filter(r => r.status === 'Approved');
  const rejectedReports = reports.filter(r => r.status === 'Rejected');

  const itemsPerPage = 5;

  const [pageStarted, setPageStarted] = useState(1);
  const [pagePending, setPagePending] = useState(1);
  const [pageApproved, setPageApproved] = useState(1);
  const [pageRejected, setPageRejected] = useState(1);

  // Reset page to 1 when the corresponding list length changes (optional UX nicety)
  useEffect(() => { setPageStarted(1); }, [startedReports.length]);
  useEffect(() => { setPagePending(1); }, [pendingReports.length]);
  useEffect(() => { setPageApproved(1); }, [approvedReports.length]);
  useEffect(() => { setPageRejected(1); }, [rejectedReports.length]);

  // Paginated slices (Now handled dynamically via helpers in render to support grouping)
  // Removed old flat pagination variables to prevent unused warnings.

  /* CSV Export Function */
  const exportToCSV = (data: Report[], filename: string) => {
    if (!data || !data.length) {
      toast.error("No data to export.");
      return;
    }

    // Define columns
    const headers = [
      "ID", "Activity ID", "Date", "Day", "Start Time", "End Time", "Duration (mins)",
      "Damage Type", "Equipment Used", "Manpower Involved", "Excavation (m3)",
      "Sand (m3)", "Aggregate (m3)", "Premix (kg)", "Cement (kg)", "Pipe Usage (m)", "Fittings",
      "Remarks", "Start Lat", "Start Long", "End Lat", "End Long", "Status", "Submitted By"
    ];

    const csvRows = [headers.join(",")];

    const escapeCSV = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return '""';
      const stringValue = String(value);
      // Escape double quotes by replacing " with ""
      const escaped = stringValue.replace(/"/g, '""'); 
      return `"${escaped}"`;
    };
    const formatDimension = (dim: Dimensions | null | undefined) => {
      if (!dim) return "0";
      // Convert the string properties from the Dimensions interface
      const l = parseFloat(dim.length) || 0;
      const w = parseFloat(dim.width) || 0;
      const d = parseFloat(dim.depth) || 1; // Use 1 as multiplier if depth is empty
      return (l * w * d).toFixed(2); 
    };

    for (const row of data) {
      const values = [
        escapeCSV(row.id),
        escapeCSV(row.activity_id),
        escapeCSV(row.date),
        escapeCSV(row.day),
        escapeCSV(row.start_time),
        escapeCSV(row.end_time),
        escapeCSV(row.duration),
        escapeCSV(row.damage_type),
        escapeCSV(row.equipment_used),
        escapeCSV(row.manpower_involved),
      escapeCSV(formatDimension(row.excavation)),
        escapeCSV(formatDimension(row.sand)),
        escapeCSV(formatDimension(row.aggregate)),
        escapeCSV(formatDimension(row.premix)),
        escapeCSV(formatDimension(row.cement)),
        escapeCSV(row.pipe_usage || 0),
        escapeCSV(row.fittings),
        escapeCSV(row.remarks), 
        escapeCSV(row.start_latitude || ''),
        escapeCSV(row.start_longitude || ''),
        escapeCSV(row.end_latitude || ''),
        escapeCSV(row.end_longitude || ''),
        escapeCSV(row.status),
        escapeCSV(row.submitted_by)
      ];
      csvRows.push(values.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const Section = ({ title, color, count, children, onExport }: { title: string, color: string, count: number, children: React.ReactNode, onExport?: () => void }) => (
    <section className="bg-white p-6 rounded-xl shadow-lg border-t-4" style={{ borderColor: color }}>
      <div className="flex justify-between items-center mb-5">
        <h2 className={`text-2xl font-bold`} style={{ color }}>
          {title} ({count})
        </h2>
        {onExport && (
          <button 
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-semibold text-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>
      <div className="space-y-4">{children}</div>
      {(!children || (Array.isArray(children) && children.length === 0)) && <p className="text-gray-500 italic">No reports in this category.</p>}
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className=" mx-auto">
        
        {/* Header */}
        <header className="mb-12 pt-2 pb-4 border-b-2 border-gray-300 pl-14 lg:pl-0">
          <h1 className="text-2xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
            Review Center
          </h1>
          <p className="text-gray-500 mt-2 italic text-lg">
            Activity Reports Dashboard: Click any report to view/edit/approve/reject.
          </p>
        </header>

        {/* Loading / Empty State */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-indigo-600 bg-white rounded-xl shadow-md">
            <Loader className="w-6 h-6 animate-spin mr-3" /> Fetching reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-md border border-gray-100">
            <p className="text-xl text-gray-500">No reports found.</p>
          </div>
        ) : (
          /* Report Sections */
          <div className="space-y-6">
            
            {/* Tab Navigation - Pill Style */}
            <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide px-4 pt-2 pb-2">
              {[
                { key: 'Ongoing', label: 'Ongoing', shortLabel: 'Ongoing', count: startedReports.length, bgColor: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600', textColor: 'text-white' },
                { key: 'Pending', label: 'Pending', shortLabel: 'Pending', count: pendingReports.length, bgColor: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600', textColor: 'text-white' },
                { key: 'Approved', label: 'Approved', shortLabel: 'Approved', count: approvedReports.length, bgColor: 'bg-green-500', hoverColor: 'hover:bg-green-600', textColor: 'text-white' },
                { key: 'Rejected', label: 'Rejected', shortLabel: 'Rejected', count: rejectedReports.length, bgColor: 'bg-red-500', hoverColor: 'hover:bg-red-600', textColor: 'text-white' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`
                    px-2 sm:px-3 py-1.5 sm:py-2 rounded-full font-medium text-xs transition-all duration-200 flex items-center gap-1 sm:gap-1.5 shadow-sm whitespace-nowrap flex-shrink-0
                    ${activeTab === tab.key
                      ? `${tab.bgColor} ${tab.textColor} scale-105 shadow-md ring-1 ring-offset-1`
                      : `bg-slate-100 text-slate-600 ${tab.hoverColor} hover:text-white`}
                  `}
                  style={activeTab === tab.key ? {
                    '--tw-ring-color': tab.bgColor.replace('bg-', '').replace('-500', ''),
                    '--tw-ring-opacity': '0.7'
                  } as React.CSSProperties : {}}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className={`px-1 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.key ? 'bg-white bg-opacity-20 text-white' : 'bg-white text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b-xl rounded-tr-xl shadow-sm border border-gray-100 min-h-[400px]">
              
              {activeTab === 'Ongoing' && (
                <Section title="Ongoing Activity" color="#f59e0b" count={groupReports(startedReports).length}>
                  {paginateGroups(groupReports(startedReports), pageStarted, itemsPerPage).map(group => (
                     <ReportListItem 
                        key={group.parent.id} 
                        report={group.parent} 
                        onClick={() => handleReportClick(group.parent)}
                        childrenReports={group.children}
                        onChildClick={handleReportClick}
                     />
                  ))}
                  <PaginationPills page={pageStarted} total={groupReports(startedReports).length} itemsPerPage={itemsPerPage} onChange={setPageStarted} />
                </Section>
              )}

              {activeTab === 'Pending' && (
                <Section title="Pending Review" color="#f59e0b" count={groupReports(pendingReports).length}>
                  {paginateGroups(groupReports(pendingReports), pagePending, itemsPerPage).map(group => (
                     <ReportListItem 
                        key={group.parent.id} 
                        report={group.parent} 
                        onClick={() => handleReportClick(group.parent)}
                        childrenReports={group.children}
                        onChildClick={handleReportClick}
                     />
                  ))}
                  <PaginationPills page={pagePending} total={groupReports(pendingReports).length} itemsPerPage={itemsPerPage} onChange={setPagePending} />
                </Section>
              )}

              {activeTab === 'Approved' && (
                <Section
                  title="Approved Reports"
                  color="#10b981"
                  count={groupReports(approvedReports).length}
                  onExport={() => {
                    const now = new Date();
                    const malaysiaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kuala_Lumpur"}));
                    const todayStr = malaysiaTime.toLocaleDateString("en-GB", {timeZone: "Asia/Kuala_Lumpur"}).replace(/\//g, '-'); // DD-MM-YYYY for filename
                    exportToCSV(approvedReports, `approved_reports_${todayStr}.csv`);
                  }}
                >
                  {paginateGroups(groupReports(approvedReports), pageApproved, itemsPerPage).map(group => (
                     <ReportListItem 
                        key={group.parent.id} 
                        report={group.parent} 
                        onClick={() => handleReportClick(group.parent)}
                        childrenReports={group.children}
                        onChildClick={handleReportClick}
                     />
                  ))}
                  <PaginationPills page={pageApproved} total={groupReports(approvedReports).length} itemsPerPage={itemsPerPage} onChange={setPageApproved} />
                </Section>
              )}

              {activeTab === 'Rejected' && (
                 <Section title="Rejected Reports" color="#ef4444" count={groupReports(rejectedReports).length}>
                   {paginateGroups(groupReports(rejectedReports), pageRejected, itemsPerPage).map(group => (
                     <ReportListItem 
                        key={group.parent.id} 
                        report={group.parent} 
                        onClick={() => handleReportClick(group.parent)}
                        childrenReports={group.children}
                        onChildClick={handleReportClick}
                     />
                   ))}
                   <PaginationPills page={pageRejected} total={groupReports(rejectedReports).length} itemsPerPage={itemsPerPage} onChange={setPageRejected} />
                 </Section>
               )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Rendering */}
      {selectedReport && (
        <ReportDetailsModal report={selectedReport} onClose={() => setSelectedReport(null)} onUpdate={handleUpdateReport} />
      )}
    </div>
  );
}