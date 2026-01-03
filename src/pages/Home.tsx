import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Clock, Activity, Layers, CheckCircle, Users, LucideIcon } from "lucide-react"; // Import LucideIcon

// --- Supabase REST API Config ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL; 
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const REPORT_TABLE = "reports";

interface Report {
  id: number;
  activity_id: string;
  date: string;
  start_time: string;
  end_time: string;
  day: string;
  duration: number;
  damage_type: string;
  equipment_used: string;
  manpower_involved: string;

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

// Interface for the StatCard component props
interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
  description: string;
  onClick?: () => void;
}

// New Modern Color Palette: Slate/Indigo for professionalism and energy
const BOLD_COLORS = {
  primary: "#4F46E5", // Indigo-600 (Darker)
  secondary: "#10B981", // Emerald-500
  tertiary: "#F59E0B", // Amber-500
  accent: "#F43F5E", // Rose-500
  background: "#F8FAFC", // Slate-50
};

const CHART_COLORS = [
  BOLD_COLORS.primary,
  BOLD_COLORS.secondary,
  BOLD_COLORS.tertiary,
  BOLD_COLORS.accent,
  "#06B6D4", // Cyan-500
  "#A855F7", // Violet-500
];

/**
 * Custom Tooltip component for Recharts
 * Safely handles data formatting and displays in a sleek dark theme.
 */
const CustomTooltip = ({ active, payload, dataSuffix = '' }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    let value = data.value;
    
    // Safety check and formatting: 
    // Format Material Usage (BarChart) to 2 decimals, others to 0.
    if (typeof value === 'number') {
      value = data.dataKey === 'value' && dataSuffix === 'units' ? value.toFixed(2) : value.toFixed(0);
    }

    return (
      <div className="p-3 bg-slate-900 bg-opacity-90 text-white rounded-lg shadow-xl border border-slate-700">
        <p className="font-semibold text-sm">{data.name}</p>
        <p className="text-lg mt-1" style={{ color: data.color || BOLD_COLORS.primary }}>
          {`${value} ${dataSuffix}`}
        </p>
      </div>
    );
  }
  return null;
};


export default function Dashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState<boolean>(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${REPORT_TABLE}`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error(`Failed to fetch reports: ${res.statusText}`);
      const data: Report[] = await res.json();
      setReports(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error fetching reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // --- Analytics calculations ---
  const validDurations = reports.map(r => Number(r.duration)).filter(d => !isNaN(d));
  const totalReports = reports.length;
  const totalDuration = validDurations.reduce((acc, d) => acc + d, 0);
  const averageDuration = totalReports > 0 ? totalDuration / validDurations.length : 0;

  // Damage type count
  const damageTypeData = Object.entries(
    reports.reduce((acc: Record<string, number>, r) => {
      acc[r.damage_type] = (acc[r.damage_type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Material usage totals
  const materialData = [
    { name: "Excavation", value: reports.reduce((acc, r) => acc + (r.excavation ?? 0), 0) },
    { name: "Sand", value: reports.reduce((acc, r) => acc + (r.sand ?? 0), 0) },
    { name: "Aggregate", value: reports.reduce((acc, r) => acc + (r.aggregate ?? 0), 0) },
    { name: "Premix", value: reports.reduce((acc, r) => acc + (r.premix ?? 0), 0) },
    { name: "Pipe", value: reports.reduce((acc, r) => acc + (r.pipe_usage ?? 0), 0) },
  ];

  // Status distribution
  const statusData = Object.entries(
    reports.reduce((acc: Record<string, number>, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Working hours per supervisor
  const supervisorHours = reports.reduce((acc: Record<string, number>, r) => {
    const duration = Number(r.duration);
    if (!isNaN(duration) && r.submitted_by) {
      acc[r.submitted_by] = (acc[r.submitted_by] || 0) + duration;
    }
    return acc;
  }, {});

  const totalSupervisors = Object.keys(supervisorHours).length;

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-medium text-slate-600 mt-3">Fetching Reports...</p>
        </div>
      </div>
    );

  // Helper component for the summary cards - NOW TYPE-SAFE
  const StatCard = ({ icon: Icon, label, value, color, description, onClick }: StatCardProps) => (
    <div
      className={`bg-white p-6 rounded-2xl shadow-lg border-t-4 ${onClick ? 'cursor-pointer hover:shadow-xl transition-shadow duration-200' : ''}`}
      style={{ borderColor: color }}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 tracking-wider uppercase">{label}</p>
          <p className="text-4xl font-extrabold text-slate-900 mt-2">{value}</p>
        </div>
        <div className="p-3 rounded-full bg-slate-100" style={{ color: color }}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-3 border-t pt-2">{description}</p>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <header className="mb-12 border-b pb-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center">
          <Layers className="w-8 h-8 mr-3 text-indigo-600"/>
          Operations Dashboard
        </h1>
        <p className="text-slate-500 mt-1 text-lg">
          Key metrics for maintenance and damage response.
        </p>
      </header>

      {/* Summary Cards - Type-safe props passed here */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
        <StatCard
          icon={Activity}
          label="Total Reports"
          value={totalReports.toString()} // Ensure value is a string
          color={BOLD_COLORS.primary}
          description="Total maintenance activities logged."
        />
        <StatCard
          icon={Clock}
          label="Total Duration"
          value={totalDuration.toFixed(1) + ' hrs'}
          color={BOLD_COLORS.secondary}
          description="Cumulative man-hours spent on repairs."
        />
        <StatCard
          icon={Users}
          label="Total Working Hours"
          value={totalSupervisors.toString()}
          color="#A855F7"
          description="Active supervisors with working hours. Click to view details."
          onClick={() => setShowWorkingHoursModal(true)}
        />
        <StatCard
          icon={Layers}
          label="Avg. Repair Time"
          value={averageDuration.toFixed(1) + ' hrs'}
          color={BOLD_COLORS.tertiary}
          description="Average time per reported incident."
        />
        <StatCard
          icon={CheckCircle}
          label="Total Materials"
          value={materialData.reduce((sum, m) => sum + m.value, 0).toFixed(0)}
          color={BOLD_COLORS.accent}
          description="Total volume/units of resources consumed."
        />
      </div>

      {/* Charts - New Sleek Design */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Damage Type Pie Chart */}
        <div className="bg-white shadow-xl rounded-2xl p-6 lg:col-span-1 border border-slate-100">
          <h2 className="text-xl font-bold mb-4 text-slate-800">
            Damage Type Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={damageTypeData}
                dataKey="value"
                nameKey="name"
                innerRadius={65} 
                outerRadius={100}
                paddingAngle={3}
                stroke="none"
              >
                {damageTypeData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip dataSuffix="reports"/>} />
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: '15px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white shadow-xl rounded-2xl p-6 lg:col-span-1 border border-slate-100">
          <h2 className="text-xl font-bold mb-4 text-slate-800">
            Report Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                paddingAngle={3}
                stroke="none"
              >
                {statusData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip dataSuffix="reports"/>} />
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: '15px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Material Usage Bar Chart */}
        <div className="bg-white shadow-xl rounded-2xl p-6 lg:col-span-3 border border-slate-100 mt-6">
          <h2 className="text-xl font-bold mb-4 text-slate-800">
            Material Usage Breakdown (Units)
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={materialData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip content={<CustomTooltip dataSuffix="units"/>} />
              <Legend />
              <Bar 
                dataKey="value" 
                fill={BOLD_COLORS.primary} 
                barSize={40} 
                radius={[5, 5, 0, 0]} 
                name="Quantity Used"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Working Hours Modal */}
      {showWorkingHoursModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-extrabold text-gray-900 flex items-center">
                <Users className="w-6 h-6 mr-3 text-purple-600" />
                Supervisor Working Hours
              </h2>
              <button
                onClick={() => setShowWorkingHoursModal(false)}
                className="text-gray-500 hover:text-gray-900 p-2 rounded-full transition hover:bg-gray-100"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Total active supervisors: <span className="font-semibold text-purple-600">{totalSupervisors}</span>
                </p>
                <div className="space-y-3">
                  {Object.entries(supervisorHours)
                    .sort(([,a], [,b]) => b - a)
                    .map(([supervisor, hours]) => (
                      <div key={supervisor} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center">
                          <Users className="w-5 h-5 mr-3 text-purple-500" />
                          <span className="font-medium text-gray-900">{supervisor}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-purple-600">{hours.toFixed(1)}</span>
                          <span className="text-sm text-gray-500 ml-1">hours</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowWorkingHoursModal(false)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
