import { useEffect, useState, MouseEventHandler, useCallback } from "react";
import { MapPin, Calendar, Hash, Layers, X, FolderOpen, Loader, Clock } from 'lucide-react';
import toast from "../utils/toast";

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
  start_time: string;
  end_time: string;
  day: string;
  duration: number; // Required number
  damage_type: string;
  equipment_used: string;
  manpower_involved: string;

  // These optional fields must allow `null` from the database and during save.
  excavation?: number | null;
  sand?: number | null;
  aggregate?: number | null;
  premix?: number | null;
  pipe_usage?: number | null;

  fittings?: string | null;
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

// ====================================================================
// --- 1. ReportDetailsModal Component (Read-Only for Approved Reports) ---
// ====================================================================
interface ModalProps {
  report: Report;
  onClose: () => void;
}

const ReportDetailsModal = ({ report, onClose }: ModalProps) => {
  // Modern input styling (read-only)
  const inputStyle = "w-full border border-gray-300 p-2 rounded-lg text-sm bg-gray-50";
  const labelStyle = "text-xs font-semibold text-gray-600 mb-1 block";

  // Section title style
  const sectionHeaderStyle = "text-xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center";
  const iconStyle = "w-5 h-5 mr-2 text-indigo-500";

  // Status badge style
  const getStatusBadge = (status: string) => {
    if (status === 'Approved') return "inline-flex items-center px-4 py-1.5 text-sm font-semibold rounded-full bg-green-100 text-green-700";
    if (status === 'Pending') return "inline-flex items-center px-4 py-1.5 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-700";
    return "inline-flex items-center px-4 py-1.5 text-sm font-semibold rounded-full bg-gray-100 text-gray-700";
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto transform transition duration-300">

        {/* Header */}
        <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex justify-between items-center z-10">
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center">
            <FolderOpen className="w-6 h-6 mr-3 text-indigo-600" />
            <span className="truncate">Report: {report.activity_id}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 p-2 rounded-full transition hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">

          {/* Status Badge */}
          <div className="flex justify-end">
            <span className={getStatusBadge(report.status)}>
              {report.status}
            </span>
          </div>

          {/* Timing & Location */}
          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner">
            <h3 className={sectionHeaderStyle}><Calendar className={iconStyle} /> Activity and Timing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className={labelStyle}>Date / Day</label>
                <p className="text-gray-800 font-medium">{report.date} ({report.day})</p>
              </div>
              <div>
                <label className={labelStyle}>Time</label>
                <p className="text-gray-800 font-medium">{report.start_time} - {report.end_time}</p>
              </div>
              <div>
                <label className={labelStyle}>Duration (hrs)</label>
                <p className="text-gray-800 font-medium">{report.duration} hrs</p>
              </div>
            </div>

            <div className="mt-6">
              <label className={labelStyle}>Damage Type</label>
              <input
                type="text"
                value={report.damage_type}
                readOnly
                className={inputStyle}
              />
            </div>
            <p className="mt-4 text-sm text-gray-600 flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-red-500" />
              Start Activity Location : {report.start_latitude ?? "N/A"}, {report.start_longitude ?? "N/A"}
              {report.start_gmap_link && <a className="text-indigo-600 hover:text-indigo-800 underline ml-2" href={report.start_gmap_link} target="_blank" rel="noopener noreferrer">View on Map</a>}
            </p>
            <p className="mt-4 text-sm text-gray-600 flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-red-500" />
              Final Report Location : {report.end_latitude ?? "N/A"}, {report.end_longitude ?? "N/A"}
              {report.end_gmap_link && <a className="text-indigo-600 hover:text-indigo-800 underline ml-2" href={report.end_gmap_link} target="_blank" rel="noopener noreferrer">View on Map</a>}
            </p>
          </section>

          {/* Resources & Manpower */}
          <section className="space-y-4 pt-4">
            <h3 className={sectionHeaderStyle}><Layers className={iconStyle} /> Resources & Manpower</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>Equipment Used</label>
                <input type="text" value={report.equipment_used} readOnly className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Manpower Involved</label>
                <input type="text" value={report.manpower_involved} readOnly className={inputStyle} />
              </div>
            </div>
          </section>

          {/* Materials */}
          <section className="space-y-4 pt-4">
            <h3 className={sectionHeaderStyle}><Hash className={iconStyle} /> Materials Quantities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className={labelStyle}>Excavation (m³)</label>
                <input type="text" value={report.excavation ?? "N/A"} readOnly className={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Sand (m³)</label>
                <input type="text" value={report.sand ?? "N/A"} readOnly className={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Aggregate (m³)</label>
                <input type="text" value={report.aggregate ?? "N/A"} readOnly className={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Premix (kg)</label>
                <input type="text" value={report.premix ?? "N/A"} readOnly className={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Pipe Usage (m)</label>
                <input type="text" value={report.pipe_usage ?? "N/A"} readOnly className={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Fittings</label>
                <input type="text" value={report.fittings ?? "N/A"} readOnly className={inputStyle} />
              </div>
            </div>
          </section>

          <p className="text-xl text-gray-500 mt-1">
            Submitted by: <span className="font-medium">{report.submitted_by}</span>
          </p>

          {report.photo_link && report.photo_link.length > 0 && (
            <section className="space-y-4 pt-4">
              <h3 className={sectionHeaderStyle}><FolderOpen className={iconStyle} /> Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {report.photo_link.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Report Photo ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:shadow-lg transition"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Remarks */}
          <section className="space-y-4 pt-4">
            <h3 className={sectionHeaderStyle}><Clock className={iconStyle} /> Final Remarks</h3>
            <textarea
              value={report.remarks ?? "No remarks provided"}
              readOnly
              rows={4}
              className={`${inputStyle} resize-y bg-yellow-50 border-yellow-200`}
            />
          </section>

        </div>
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
}

const ReportListItem = ({ report, onClick }: ListItemProps) => {
  // Status badge style
  const getStatusBadge = (status: string) => {
    if (status === 'Approved') return "inline-block px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-md bg-green-500 text-white";
    if (status === 'Pending') return "inline-block px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-md bg-yellow-500 text-white";
    return "inline-block px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-md bg-gray-500 text-white";
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-5 border border-gray-100 cursor-pointer
                    hover:shadow-2xl hover:border-indigo-400 transition duration-300
                    transform hover:-translate-y-1 flex justify-between items-center"
      onClick={onClick}
    >
      {/* Left: ID, Date, Type */}
      <div>
        <h3 className="text-xl font-extrabold text-gray-800 flex items-center">
          <MapPin className="w-5 h-5 mr-3 text-indigo-500" />
          {report.activity_id}
        </h3>
        <p className="text-sm text-gray-500 ml-8 mt-1">
          <span className="font-semibold">{report.date}</span> &bull; {report.damage_type}
           <p className="text-sm text-gray-500 mt-1">
  Submitted by: <span className="font-medium">{report.submitted_by}</span>
</p>
        </p>
      </div>

      {/* Right: Duration and Status */}
      <div className="text-right flex items-center space-x-4">
        <p className="text-base font-medium text-gray-600">
          <span className="block text-xs font-normal text-gray-400">Duration</span>
          {report.duration} hours
        </p>
        <span className={getStatusBadge(report.status)}>
          {report.status}
        </span>
      </div>
    </div>
  );
};



// ====================================================================
// --- 3. ApprovedReportsPage Component (Main) ---
// ====================================================================
export default function ApprovedReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved'>('Pending');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = `${supabaseUrl}/rest/v1/reports?select=*&status=in.(Approved,Pending)&order=status.asc,created_at.desc`;
      if (role === 'supervisor' && username) {
        query += `&submitted_by=eq.${username}`;
      }
      const res = await fetch(query, { headers });
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data: Report[] = await res.json();
      setReports(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch reports");
    }
    setLoading(false);
  }, [role, username]);

  useEffect(() => {
    const getUserRole = async () => {
      const cookie = document.cookie.split("; ").find(c => c.startsWith("username="));
      if (!cookie) return;

      const user = cookie.split("=")[1];
      setUsername(user);
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/adiav?username=eq.${user}&select=role`,
          { headers }
        );
        const data = await res.json();
        if (data.length) setRole(data[0].role);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch user role.");
      }
    };
    getUserRole();
  }, []);

  useEffect(() => {
    if (role) {
      fetchReports();
    }
  }, [role, fetchReports]);

  const handleReportClick = (report: Report) => setSelectedReport(report);

  // Separate reports by status
  const pendingReports = reports.filter(r => r.status === 'Pending');
  const approvedReports = reports.filter(r => r.status === 'Approved');

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className=" mx-auto">

        {/* Header */}
        <header className="mb-12 pt-2 pb-4 border-b-2 border-gray-300">
          <h1 className="text-2xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
            Report Status
          </h1>
          <p className="text-gray-500 mt-2 italic text-lg">
            {role === 'supervisor' ? 'View your report status including pending and approved reports.' : 'View all reports status including pending and approved reports.'} Click any report for detailed information.
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
          <div className="space-y-6">
             {/* Tab Navigation */}
             <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1 mb-6">
              {[
                { key: 'Pending', label: 'Pending Reports', count: pendingReports.length, color: 'text-yellow-600', border: 'border-yellow-500' },
                { key: 'Approved', label: 'Approved Reports', count: approvedReports.length, color: 'text-green-600', border: 'border-green-500' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`
                    px-6 py-3 rounded-t-lg font-bold text-sm transition-all duration-200 flex items-center gap-2 border-b-2
                    ${activeTab === tab.key 
                      ? `bg-white ${tab.color} ${tab.border} shadow-sm -mb-[2px]` 
                      : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-700'}
                  `}
                >
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-gray-100' : 'bg-gray-200'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b-xl rounded-tr-xl shadow-sm border border-gray-100 min-h-[400px]">
            {/* Pending Reports Section */}
            {activeTab === 'Pending' && (
              <div className="p-6">
                 {pendingReports.length === 0 ? (
                    <p className="text-gray-500 italic">No pending reports.</p>
                 ) : (
                  <div className="space-y-4">
                    {pendingReports.map(r => <ReportListItem key={r.id} report={r} onClick={() => handleReportClick(r)} />)}
                  </div>
                 )}
              </div>
            )}

            {/* Approved Reports Section */}
            {activeTab === 'Approved' && (
              <div className="p-6">
                 {approvedReports.length === 0 ? (
                    <p className="text-gray-500 italic">No approved reports.</p>
                 ) : (
                  <div className="space-y-4">
                    {approvedReports.map(r => <ReportListItem key={r.id} report={r} onClick={() => handleReportClick(r)} />)}
                  </div>
                 )}
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Rendering */}
      {selectedReport && (
        <ReportDetailsModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
}
