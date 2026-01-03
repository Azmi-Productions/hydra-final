import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Loader2 } from "lucide-react";
import toast from "../utils/toast";

// --- Constants (Unchanged) ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const cookieUsername = document.cookie
      .split("; ")
      .find((row) => row.startsWith("username="))
      ?.split("=")[1];
    if (cookieUsername) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error("Username and password are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/adiav?username=eq.${username}&password=eq.${password}`,
        {
          method: "GET",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const data = await res.json();

      if (res.ok && data.length > 0) {
        document.cookie = `username=${data[0].username}; path=/; max-age=86400`;
        toast.success("Login successful! Redirecting...");
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        toast.error("Invalid username or password.");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("An unexpected error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // 1. Light background for "white vibes"
    <div className="min-h-screen bg-gray-50 text-gray-900 px-6 py-20 flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* Subtle Background (Removed dark grid) */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white via-indigo-50/50 to-gray-100" />

      {/* Main Login Card - White background, crisp shadow */}
      <div className="relative z-10 bg-white p-8 md:p-10 rounded-xl shadow-2xl shadow-indigo-200/50 w-full max-w-sm space-y-8 border border-gray-100">
        
        {/* Header Section: Now includes the link */}
        <div className="text-center space-y-1">
          {/* 2. Logo Link Implementation */}
          <a href="/" className="group block focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg">
             {/* Replace LogIn icon with a placeholder for your actual logo image */}
             {/* If you have a square logo image, use: <img src="/path/to/your/logo.svg" alt="ADIA V Logo" className="w-16 h-16 mx-auto mb-3" /> */}
             <LogIn className="w-10 h-10 mx-auto text-indigo-600 mb-3 transition-colors group-hover:text-indigo-700" />
             
             {/* Text acts as the link/logo label */}
             <div className="text-3xl font-extrabold text-indigo-600 transition-colors group-hover:text-indigo-700">
                ADIA V
             </div>
          </a>
          
          <p className="text-gray-500 text-lg font-medium pt-1">REPORT MONITORING SYSTEM</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div>
            <label
              htmlFor="username-input"
              className="block text-sm text-gray-700 mb-2 font-semibold"
            >
              Username
            </label>
            <input
              id="username-input"
              type="text"
              // Input styling changed for light background
              className="w-full px-5 py-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder-gray-500 shadow-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="password-input"
              className="block text-sm text-gray-700 mb-2 font-semibold"
            >
              Password
            </label>
            <input
              id="password-input"
              type="password"
              className="w-full px-5 py-3 rounded-lg bg-white text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder-gray-500 shadow-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !username.trim() || !password.trim()}
            // Button is still bold Indigo for contrast
            className="w-full bg-indigo-600 text-white font-extrabold py-3 rounded-lg shadow-lg shadow-indigo-600/30 transition-all duration-300 flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" /> Logging in...
              </>
            ) : (
              "Secure Login"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}