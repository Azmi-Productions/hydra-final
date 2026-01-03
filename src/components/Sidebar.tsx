import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface SidebarProps {
  children?: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const toggleSidebar = () => setIsOpen(!isOpen);

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
    { to: '/dashboard', label: 'Overview', allowedRoles: ['superadmin', 'admin'] },
    { to: '/report-overview', label: 'Reports Center', allowedRoles: ['superadmin', 'admin'] },
    { to: '/approved-reports', label: 'Approved Reports', allowedRoles: ['superadmin', 'admin', 'supervisor'] },
    { to: '/user-management', label: 'User Manager', allowedRoles: ['superadmin'] },
    { to: '/device-manager', label: 'Device Manager', allowedRoles: ['superadmin', 'admin'] },
    { to: '/live-map', label: 'Live Map', allowedRoles: ['superadmin', 'admin'] },
    { to: '/report-submission', label: 'Report Submission', allowedRoles: ['superadmin', 'admin', 'supervisor'] },
  ];

  return (
    <div className="relative min-h-screen bg-black flex">

      {/* Mobile Toggle Button */}
      <button
        className="lg:hidden fixed top-4 left-4 bg-black text-white p-2 rounded-full shadow-lg focus:outline-none z-50 hover:bg-white hover:text-black transition duration-300"
        onClick={toggleSidebar}
      >
        {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static fixed top-0 left-0 h-screen w-72 bg-black text-white 
          border-r border-gray-800 shadow-xl z-40 transition-transform duration-300 
          flex flex-col justify-between`}
      >

        {/* Top Logo */}
        <div className="flex justify-center items-center border-b border-gray-800 py-5">
          <img src="https://azmiproductions.com/assets/img/adia.png" alt="Logo" className="w-24 h-auto" />
        </div>

        {/* Navigation Items */}
        <ul className="mt-8 space-y-4 px-6 flex-1 overflow-y-auto pb-10">
          {navItems
            .filter(item => role && item.allowedRoles.includes(role))
            .map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      isActive ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
        </ul>

        {/* Logout Button */}
        <div className="px-6 mb-4">
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold shadow-lg transition-all duration-300"
          >
            Logout
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center text-gray-500 text-xs">
          Powered by <span className="text-cyan-500 font-semibold">AZP GROUP SDN BHD</span>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default Sidebar;
