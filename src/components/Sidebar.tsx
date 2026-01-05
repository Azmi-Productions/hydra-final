import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { 
  LayoutDashboard, 
  FileText,
  FileCheck,
  Users, 
  Cpu, 
  Map, 
  Send,
  ChevronLeft,
  ChevronRight,
  LogOut 
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface SidebarProps {
  children?: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const handleLogout = () => {
    document.cookie = "username=; path=/; max-age=0";
    window.location.href = "/login";
  };

  useEffect(() => {
    const getUserRole = async () => {
      const cookie = document.cookie.split("; ").find(c => c.startsWith("username="));
      if (!cookie) return;

      const username = cookie.split("=")[1];
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/adiav?username=eq.${username}&select=role`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        const data = await res.json();
        if (data.length) setRole(data[0].role);
      } catch (err) {
        console.error(err);
      }
    };
    getUserRole();
  }, []);

  const navItems = [
    { to: '/dashboard', label: 'Overview', allowedRoles: ['superadmin', 'admin'], icon: LayoutDashboard },
    { to: '/report-overview', label: 'Reports Center', allowedRoles: ['superadmin', 'admin'], icon: FileText },
    { to: '/approved-reports', label: 'Approved Reports', allowedRoles: ['superadmin', 'admin', 'supervisor'], icon: FileCheck },
    { to: '/user-management', label: 'User Manager', allowedRoles: ['superadmin'], icon: Users },
    { to: '/device-manager', label: 'Device Manager', allowedRoles: ['superadmin', 'admin'], icon: Cpu },
    { to: '/live-map', label: 'Live Map', allowedRoles: ['superadmin', 'admin'], icon: Map },
    { to: '/report-submission', label: 'Report Submission', allowedRoles: ['superadmin', 'admin', 'supervisor'], icon: Send },
  ];

  return (
    <div className="relative min-h-screen bg-black flex">

      {/* Mobile Toggle Button */}
      <button
        className="lg:hidden fixed top-4 left-4 bg-white text-black p-2 rounded-full shadow-lg focus:outline-none z-50 hover:bg-gray-100 border border-gray-200 transition duration-300"
        onClick={toggleSidebar}
      >
        {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-0' : 'lg:w-72'} 
          fixed lg:sticky top-0 left-0 h-screen bg-white text-black 
          border-r border-gray-200 shadow-xl z-40 transition-all duration-300 
          flex flex-col justify-between whitespace-nowrap`}
      >
        
        {/* Toggle Collapse Button (Desktop Only) */}
        <button
          onClick={toggleCollapse}
          className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 bg-gray-100 text-black border border-gray-200 rounded-full p-2 shadow-md hover:bg-gray-200 transition-all z-50 ${isCollapsed ? 'left-2' : '-right-3'}`}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* Content Container - Hidden when collapsed */}
        <div className={`flex flex-col h-full w-full ${isCollapsed ? 'hidden' : 'flex'}`}>
            {/* Top Logo */}
            <div className="flex justify-center items-center border-b border-gray-200 py-5 transition-all duration-300 overflow-hidden">
                <img src="https://azmiproductions.com/assets/img/adia.png" alt="Logo" className="w-24 h-auto" />
            </div>

            {/* Navigation Items */}
            <ul className="mt-8 space-y-4 px-3 flex-1 overflow-y-auto pb-10">
            {navItems
                .filter(item => role && item.allowedRoles.includes(role))
                .map(({ to, label, icon: Icon }) => (
                <li key={to}>
                    <NavLink
                    to={to}
                    className={({ isActive }) =>
                        `flex items-center gap-3 py-3 px-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        isActive ? 'bg-black text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                        }`
                    }
                    >
                    <Icon size={20} />
                    <span className="block whitespace-nowrap">
                        {label}
                    </span>
                    </NavLink>
                </li>
                ))}
            </ul>

            {/* Logout Button */}
            <div className="px-3 mb-4">
            <button
                onClick={handleLogout}
                className={`w-full py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold shadow-lg transition-all duration-300 flex items-center justify-center gap-2`}
            >
                <LogOut size={20} />
                <span>Logout</span>
            </button>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 text-center text-gray-500 text-xs whitespace-nowrap overflow-hidden">
                Powered by <span className="text-cyan-500 font-semibold">AZP GROUP</span>
            </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default Sidebar;
