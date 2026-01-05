import { useEffect, useState } from "react";
import toast from "../utils/toast";
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
import { Clock, Activity, Layers,  Users, LucideIcon, TrendingUp } from "lucide-react";
import { colors, spacing, typography, borderRadius, shadows } from '../designTokens';

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
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: colors.background.offWhite }}
      >
        <div className="text-center">
            <svg
              className="animate-spin mx-auto"
              style={{
                width: spacing[8],
                height: spacing[8],
                color: colors.accent.mutedBlue
              }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.medium,
                color: colors.neutral.gray600,
                marginTop: spacing[3]
              }}
            >
              Loading overview data...
            </p>
        </div>
      </div>
    );

  // Helper component for the summary cards - NOW TYPE-SAFE
  const StatCard = ({ icon: Icon, label, value, color, description, onClick }: StatCardProps) => (
    <div
      className={`bg-white rounded-xl ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' : ''}`}
      style={{
        padding: spacing[6],
        boxShadow: shadows.base,
        border: `1px solid ${colors.neutral.gray200}`,
        borderTop: `4px solid ${color}`,
        borderRadius: borderRadius.xl
      }}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.neutral.gray500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: typography.fontSize['4xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.charcoal,
              marginTop: spacing[2]
            }}
          >
            {value}
          </p>
        </div>
        <div
          style={{
            padding: spacing[3],
            borderRadius: borderRadius.full,
            backgroundColor: colors.neutral.gray100,
            color: color
          }}
        >
          <Icon style={{ width: spacing[6], height: spacing[6] }} />
        </div>
      </div>
      <p
        style={{
          fontSize: typography.fontSize.xs,
          color: colors.neutral.gray400,
          marginTop: spacing[3],
          paddingTop: spacing[2],
          borderTop: `1px solid ${colors.neutral.gray200}`
        }}
      >
        {description}
      </p>
    </div>
  );

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: colors.background.offWhite,
        fontFamily: typography.fontFamily.primary
      }}
    >
      {/* Header */}
      <div
        className="border-b"
        style={{
          padding: `${spacing[8]} ${spacing[8]} ${spacing[6]} ${spacing[8]}`,
          borderColor: colors.neutral.gray200,
          backgroundColor: colors.neutral.gray50
        }}
      >
        <div className="max-w-7xl mx-auto">
          <h1
            className="flex items-center"
            style={{
              fontSize: typography.fontSize['4xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.charcoal,
              marginBottom: spacing[2]
            }}
          >
            <TrendingUp
              style={{
                width: spacing[8],
                height: spacing[8],
                marginRight: spacing[3],
                color: colors.accent.mutedBlue
              }}
            />
            Overview
          </h1>
          <p
            style={{
              fontSize: typography.fontSize.lg,
              color: colors.neutral.gray600,
              margin: 0
            }}
          >
            Monitor key performance metrics and operational insights
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: `${spacing[8]} ${spacing[8]}` }}>
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Key Metrics Section */}
          <section>
            <h2
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.charcoal,
                marginBottom: spacing[6]
              }}
            >
              Key Metrics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Activity}
                label="Total Reports"
                value={totalReports.toString()}
                color={colors.accent.mutedBlue}
                description="Total maintenance activities logged"
              />
              <StatCard
                icon={Clock}
                label="Total Hours"
                value={totalDuration.toFixed(1) + ' hrs'}
                color={colors.semantic.success}
                description="Cumulative man-hours spent"
              />
              <StatCard
                icon={Users}
                label="Active Supervisors"
                value={totalSupervisors.toString()}
                color={colors.secondary.slateBlue}
                description="Supervisors with working hours"
                onClick={() => setShowWorkingHoursModal(true)}
              />
              <StatCard
                icon={Layers}
                label="Avg Repair Time"
                value={averageDuration.toFixed(1) + ' hrs'}
                color={colors.semantic.warning}
                description="Average time per incident"
              />
            </div>
          </section>

          {/* Analytics Section */}
          <section>
            <h2
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.charcoal,
                marginBottom: spacing[6]
              }}
            >
              Analytics
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Damage Type Analysis */}
              <div
                className="bg-white rounded-xl p-6"
                style={{
                  boxShadow: shadows.base,
                  border: `1px solid ${colors.neutral.gray200}`
                }}
              >
                <h3
                  style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.charcoal,
                    marginBottom: spacing[4]
                  }}
                >
                  Damage Types
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={damageTypeData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
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
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      wrapperStyle={{ paddingTop: spacing[4] }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div
                className="bg-white rounded-xl p-6"
                style={{
                  boxShadow: shadows.base,
                  border: `1px solid ${colors.neutral.gray200}`
                }}
              >
                <h3
                  style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.charcoal,
                    marginBottom: spacing[4]
                  }}
                >
                  Report Status
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                      paddingAngle={2}
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
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      wrapperStyle={{ paddingTop: spacing[4] }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Material Usage Chart - Full Width */}
            <div
              className="bg-white rounded-xl p-6 mt-8"
              style={{
                boxShadow: shadows.base,
                border: `1px solid ${colors.neutral.gray200}`
              }}
            >
              <h3
                style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.charcoal,
                  marginBottom: spacing[4]
                }}
              >
                Material Usage Overview
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={materialData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    style={{ fill: colors.neutral.gray600 }}
                  />
                  <YAxis
                    style={{ fill: colors.neutral.gray600 }}
                  />
                  <Tooltip content={<CustomTooltip dataSuffix="units"/>} />
                  <Bar
                    dataKey="value"
                    fill={colors.accent.mutedBlue}
                    radius={[4, 4, 0, 0]}
                    name="Quantity Used"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>

      {/* Working Hours Modal */}
      {showWorkingHoursModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: colors.overlay.modal
          }}
        >
          <div
            className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            style={{
              boxShadow: shadows['2xl'],
              borderRadius: borderRadius['2xl']
            }}
          >
            <div
              className="sticky top-0 bg-white border-b flex justify-between items-center"
              style={{
                padding: spacing[6],
                borderColor: colors.neutral.gray200,
                borderRadius: `${borderRadius['2xl']} ${borderRadius['2xl']} 0 0`
              }}
            >
              <h2
                className="flex items-center"
                style={{
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.charcoal
                }}
              >
                <Users
                  style={{
                    width: spacing[6],
                    height: spacing[6],
                    marginRight: spacing[3],
                    color: colors.secondary.slateBlue
                  }}
                />
                Supervisor Working Hours
              </h2>
              <button
                onClick={() => setShowWorkingHoursModal(false)}
                className="rounded-full transition hover:bg-gray-100"
                style={{
                  color: colors.neutral.gray500,
                  padding: spacing[2]
                }}
                aria-label="Close"
              >
                <svg style={{ width: spacing[6], height: spacing[6] }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ padding: spacing[6] }}>
              <div style={{ marginBottom: spacing[6] }}>
                <p
                  style={{
                    color: colors.neutral.gray600,
                    marginBottom: spacing[4],
                    fontSize: typography.fontSize.base
                  }}
                >
                  Total active supervisors: <span
                    style={{
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.secondary.slateBlue
                    }}
                  >
                    {totalSupervisors}
                  </span>
                </p>
                <div className="space-y-3">
                  {Object.entries(supervisorHours)
                    .sort(([,a], [,b]) => b - a)
                    .map(([supervisor, hours]) => (
                      <div
                        key={supervisor}
                        className="flex justify-between items-center rounded-lg"
                        style={{
                          padding: spacing[4],
                          backgroundColor: colors.neutral.gray50,
                          border: `1px solid ${colors.neutral.gray200}`,
                          borderRadius: borderRadius.lg
                        }}
                      >
                        <div className="flex items-center">
                          <Users
                            style={{
                              width: spacing[5],
                              height: spacing[5],
                              marginRight: spacing[3],
                              color: colors.secondary.slateBlue
                            }}
                          />
                          <span
                            style={{
                              fontWeight: typography.fontWeight.medium,
                              color: colors.text.charcoal
                            }}
                          >
                            {supervisor}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            style={{
                              fontSize: typography.fontSize['2xl'],
                              fontWeight: typography.fontWeight.bold,
                              color: colors.secondary.slateBlue
                            }}
                          >
                            {hours.toFixed(1)}
                          </span>
                          <span
                            style={{
                              fontSize: typography.fontSize.sm,
                              color: colors.neutral.gray500,
                              marginLeft: spacing[1]
                            }}
                          >
                            hours
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowWorkingHoursModal(false)}
                  style={{
                    padding: `${spacing[2]} ${spacing[6]}`,
                    backgroundColor: colors.secondary.slateBlue,
                    color: colors.neutral.gray50,
                    borderRadius: borderRadius.lg,
                    fontWeight: typography.fontWeight.medium,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = colors.primary.navy;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = colors.secondary.slateBlue;
                  }}
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
