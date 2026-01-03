import { useEffect, useState, MouseEventHandler } from "react";
import { MapPin, Calendar, Hash, Layers, X, FolderOpen, Loader, Check, XCircle, Edit3, Loader2, Clock } from 'lucide-react';
import toast from "react-hot-toast";

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
// --- 1. ReportDetailsModal Component ---
// ====================================================================
interface ModalProps {
  report: Report;
  onClose: () => void;
  onUpdate: (updated: Report | null) => void; // allow null when deleted
}

const ReportDetailsModal = ({ report, onClose, onUpdate }: ModalProps) => {
  const [editableReport, setEditableReport] = useState<Report>({ ...report });
  const [saving, setSaving] = useState(false);

  const optionalNullableNumberFields: (keyof Report)[] = ['excavation', 'sand', 'aggregate', 'premix', 'pipe_usage', 'start_latitude', 'start_longitude','end_latitude', 'end_longitude'];
  const optionalNullableStringFields: (keyof Report)[] = ['fittings', 'remarks'];

  const handleChange = (field: keyof Report, value: string | number) => {
    let finalValue: string | number | null | undefined = value;
    
    // Logic for optional number fields
    if (typeof value === 'string' && optionalNullableNumberFields.includes(field)) {
      const numValue = Number(value);
      finalValue = value.trim() === '' || isNaN(numValue) ? undefined : numValue;
    }
    
    // Logic for optional string fields
    if (typeof value === 'string' && optionalNullableStringFields.includes(field)) {
        finalValue = value.trim() === '' ? undefined : value;
    }
    
    setEditableReport(prev => ({ ...prev, [field]: finalValue } as any));
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;

    setSaving(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${report.id}`, {
        method: "DELETE",
        headers
      });

      if (!res.ok) throw new Error("Failed to delete report");

      toast.success("Report deleted successfully!");
      onUpdate(null); // signal parent to remove this report
      onClose();

      // Refresh the page (keeps behaviour consistent with existing code)
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete report.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Use `any` type for `updates` to resolve type-checking when assigning null.
      const updates: { [key: string]: any } = {};

      (Object.keys(editableReport) as (keyof Report)[]).forEach(key => {
        if (editableReport[key] !== report[key]) {
          // Send `null` if the state value is `undefined` (cleared input), otherwise send the value.
          updates[key] = editableReport[key] === undefined ? null : editableReport[key];
        }
      });
      
      const res = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${report.id}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Prefer": "return=representation" // this tells Supabase to return the updated row(s)
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update report");

      const updatedData = await res.json(); // now safe to parse

      onUpdate(updatedData[0] || editableReport); 
      toast.success("Changes saved successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes.");
    }
    setSaving(false);
  };

  const handleStatusChange = async (status: "Approved" | "Rejected") => {
    setSaving(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${report.id}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Prefer": "return=representation"
        },
        body: JSON.stringify({ status }), // or `updates` object
      });

      if (!res.ok) throw new Error("Failed to update status");
      
      const updatedData = await res.json();
      onUpdate(updatedData[0] || { ...editableReport, status });
      toast.success(`Report ${status} successfully!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to change status.");
    }
    setSaving(false);
  };

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
        <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex justify-between items-center z-10">
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center">
            <FolderOpen className="w-6 h-6 mr-3 text-indigo-600" />
            <span className="truncate">Report Review: {report.activity_id}</span>
            
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
            <span className={`inline-flex items-center px-4 py-1.5 text-sm font-semibold rounded-full ${
              editableReport.status === 'Approved' ? 'bg-green-100 text-green-700' :
              editableReport.status === 'Rejected' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {editableReport.status}
            </span>
          </div>

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
                <label className={labelStyle}>Duration (hrs)</label>
                <p className="text-gray-800 font-medium">{editableReport.duration} hrs</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className={labelStyle}>Excavation (m³)</label>
                <input type="number" value={editableReport.excavation ?? ""} onChange={(e) => handleChange("excavation", e.target.value)} className={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Sand (m³)</label>
                <input type="number" value={editableReport.sand ?? ""} onChange={(e) => handleChange("sand", e.target.value)} className={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Aggregate (m³)</label>
                <input type="number" value={editableReport.aggregate ?? ""} onChange={(e) => handleChange("aggregate", e.target.value)} className={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Premix (kg)</label>
                <input type="number" value={editableReport.premix ?? ""} onChange={(e) => handleChange("premix", e.target.value)} className={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Pipe Usage (m)</label>
                <input type="number" value={editableReport.pipe_usage ?? ""} onChange={(e) => handleChange("pipe_usage", e.target.value)} className={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className={labelStyle}>Fittings</label>
                <input type="text" value={editableReport.fittings ?? ""} onChange={(e) => handleChange("fittings", e.target.value)} className={inputStyle} />
              </div>
            </div>
          </section>

          <p className="text-xl text-gray-500  mt-1">
            Submitted by: <span className="font-medium">{report.submitted_by}</span>
          </p>

          {editableReport.photo_link && editableReport.photo_link.length > 0 && (
            <section className="space-y-4 pt-4">
              <h3 className={sectionHeaderStyle}><FolderOpen className={iconStyle} /> Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {editableReport.photo_link.map((url, idx) => (
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
              onClick={handleDelete} 
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
  const statusColor = report.status === 'Approved'
    ? 'bg-green-500 text-white'
    : report.status === 'Rejected'
    ? 'bg-red-500 text-white'
    : 'bg-yellow-500 text-gray-900';

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
           <p className="text-sm text-gray-500  mt-1">
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
        <span className={`inline-block px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-md ${statusColor}`}>
          {report.status}
        </span>
      </div>
    </div>
  );
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

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/reports?select=*&order=created_at.desc`, { headers });
      if (!res.ok) throw new Error("Failed to fetch");
      const data: Report[] = await res.json();
      const reportsWithStatus = data.map((r) => ({ ...r, status: r.status || 'Pending' }));
      setReports(reportsWithStatus);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch reports");
    }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const handleReportClick = (report: Report) => setSelectedReport(report);

  const handleUpdateReport = (updated: Report | null) => {
    // if updated is null => remove the report
    if (updated === null) {
      setReports(prev => prev.filter(r => r.id !== (selectedReport ? selectedReport.id : -1)));
      return;
    }
    setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const startedReports = reports.filter(r => r.status === 'Started');
  const pendingReports = reports.filter(r => r.status === 'Pending');
  const approvedReports = reports.filter(r => r.status === 'Approved');
  const rejectedReports = reports.filter(r => r.status === 'Rejected');

  const itemsPerPage = 3;

  const [pageStarted, setPageStarted] = useState(1);
  const [pagePending, setPagePending] = useState(1);
  const [pageApproved, setPageApproved] = useState(1);
  const [pageRejected, setPageRejected] = useState(1);

  // Reset page to 1 when the corresponding list length changes (optional UX nicety)
  useEffect(() => { setPageStarted(1); }, [startedReports.length]);
  useEffect(() => { setPagePending(1); }, [pendingReports.length]);
  useEffect(() => { setPageApproved(1); }, [approvedReports.length]);
  useEffect(() => { setPageRejected(1); }, [rejectedReports.length]);

  // Paginated slices
  const startedPaginated = startedReports.slice(
    (pageStarted - 1) * itemsPerPage,
    pageStarted * itemsPerPage
  );

  const pendingPaginated = pendingReports.slice(
    (pagePending - 1) * itemsPerPage,
    pagePending * itemsPerPage
  );

  const approvedPaginated = approvedReports.slice(
    (pageApproved - 1) * itemsPerPage,
    pageApproved * itemsPerPage
  );

  const rejectedPaginated = rejectedReports.slice(
    (pageRejected - 1) * itemsPerPage,
    pageRejected * itemsPerPage
  );

  const Section = ({ title, color, count, children }: { title: string, color: string, count: number, children: React.ReactNode }) => (
    <section className="bg-white p-6 rounded-xl shadow-lg border-t-4" style={{ borderColor: color }}>
      <h2 className={`text-2xl font-bold mb-5`} style={{ color }}>
        {title} ({count})
      </h2>
      <div className="space-y-4">{children}</div>
      {(!children || (Array.isArray(children) && children.length === 0)) && <p className="text-gray-500 italic">No reports in this category.</p>}
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className=" mx-auto">
        
        {/* Header */}
        <header className="mb-12  pt-2 pb-4 border-b-2 border-gray-300">
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
          <div className="space-y-8">
            <Section title="Ongoing Activity" color="#f59e0b" count={startedReports.length}>
              {startedPaginated.map(r => <ReportListItem key={r.id} report={r} onClick={() => handleReportClick(r)} />)}
              <PaginationPills
                page={pageStarted}
                total={startedReports.length}
                itemsPerPage={itemsPerPage}
                onChange={setPageStarted}
              />
            </Section>

            <Section title="Pending Review" color="#f59e0b" count={pendingReports.length}>
              {pendingPaginated.map(r => <ReportListItem key={r.id} report={r} onClick={() => handleReportClick(r)} />)}
              <PaginationPills
                page={pagePending}
                total={pendingReports.length}
                itemsPerPage={itemsPerPage}
                onChange={setPagePending}
              />
            </Section>

            <Section title="Approved Reports" color="#10b981" count={approvedReports.length}>
              {approvedPaginated.map(r => <ReportListItem key={r.id} report={r} onClick={() => handleReportClick(r)} />)}
              <PaginationPills
                page={pageApproved}
                total={approvedReports.length}
                itemsPerPage={itemsPerPage}
                onChange={setPageApproved}
              />
            </Section>

            <Section title="Rejected Reports" color="#ef4444" count={rejectedReports.length}>
              {rejectedPaginated.map(r => <ReportListItem key={r.id} report={r} onClick={() => handleReportClick(r)} />)}
              <PaginationPills
                page={pageRejected}
                total={rejectedReports.length}
                itemsPerPage={itemsPerPage}
                onChange={setPageRejected}
              />
            </Section>
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
