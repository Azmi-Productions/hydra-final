// src/components/Layout.tsx
import Navbar from './Sidebar';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen font-inter text-gray-800 dark:text-white bg-gradient-to-br from-[#fefce8] via-[#f0f4ff] to-[#ecfdf5] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <Outlet />
    </div>
  );
}
