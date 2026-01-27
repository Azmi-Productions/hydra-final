import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import ReportSubmissionPage from "./pages/ReportSubmission";
import ReportsListPage from "./pages/ReportsPage";
import ApprovedReportsPage from "./pages/ApprovedReports";
import UserManagementPage from "./pages/UserManage";
import Sidebar from "./components/Sidebar.tsx";
import LiveDeviceMap from "./pages/LiveMap.tsx";
import { Toaster } from "react-hot-toast";
import DeviceStatusPage from "./pages/Devices.tsx";
import Dashboard from "./pages/Home.tsx";
import LocationHistoryPage from "./pages/LocationHistory.tsx";
import Register from "./pages/Register.tsx";

function AppWrapper() {
  const location = useLocation();
  const hideSidebar = ["/", "/login", "/register"].includes(location.pathname);

  return (
    <div className="min-h-screen font-inter flex">
      {/* Sidebar */}
      {!hideSidebar && <Sidebar />}

      {/* Main Content */}
      <div className="flex-1">
        <Routes>
          {/* Public Login */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Reports Page (Admin + Superadmin) */}
          <Route
            path="/report-overview"
            element={
              <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
                <ReportsListPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/device-manager"
            element={
              <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
                <DeviceStatusPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/device-history/:deviceId"
            element={
              <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
                <LocationHistoryPage />
              </ProtectedRoute>
            }
          />

          {/* User Management (Superadmin only) */}
          <Route
            path="/user-management"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

      

          {/* Report Submission (All roles) */}
          <Route
            path="/report-submission"
            element={
              <ProtectedRoute allowedRoles={["admin", "superadmin", "supervisor"]}>
                <ReportSubmissionPage />
              </ProtectedRoute>
            }
          />

          {/* Approved Reports (All roles) */}
          <Route
            path="/approved-reports"
            element={
              <ProtectedRoute allowedRoles={["admin", "superadmin", "supervisor"]}>
                <ApprovedReportsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/live-map"
            element={
              <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
                <LiveDeviceMap />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
     <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        containerStyle={{ zIndex: 99999, top: 40 }}
      />
    <Router>
      <AppWrapper />
    </Router>
    </>
  );
}

export default App;
