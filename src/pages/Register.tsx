import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, Loader2 } from "lucide-react";
import toast from "../utils/toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // The role is handled here in the background
  const DEFAULT_ROLE = "admin"; 

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
      toast.error("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      // 1. Check if username exists
      const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/adiav?username=eq.${username}`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        }
      );
      const existingUsers = await checkRes.json();

      if (existingUsers.length > 0) {
        toast.error("Username already taken.");
        setLoading(false);
        return;
      }

      // 2. Perform Insert
      const res = await fetch(`${SUPABASE_URL}/rest/v1/adiav`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation", 
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          role: DEFAULT_ROLE, // Sent automatically
          created_at: new Date().toISOString(),
        }),
      });

      const responseData = await res.json();

      if (res.ok) {
        toast.success("Account created successfully!");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        console.error("Supabase Detail:", responseData);
        toast.error(responseData.message || "Failed to register");
      }
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 px-6 py-12 flex items-center justify-center relative overflow-hidden">
      
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white via-indigo-50/50 to-gray-100" />

      <div className="relative z-10 bg-white p-8 md:p-10 rounded-xl shadow-2xl shadow-indigo-200/50 w-full max-w-sm space-y-6 border border-gray-100">
        
        <div className="text-center space-y-1">
          <UserPlus className="w-10 h-10 mx-auto text-indigo-600 mb-2" />
          <h2 className="text-3xl font-extrabold text-indigo-600 tracking-tight">Create Account</h2>
          <p className="text-gray-500 font-medium">Join the ADIA V System</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5 font-bold">Username</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5 font-bold">Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5 font-bold">Confirm Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading || !username || !password}
            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-lg shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign Up"}
          </button>
        </div>

        <div className="pt-6 border-t border-gray-100 text-center">
          <p className="text-gray-500 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}