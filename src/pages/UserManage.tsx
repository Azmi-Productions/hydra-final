import { useEffect, useState, useMemo } from "react";
import { Trash2, Loader2, UserPlus, Calendar, Fingerprint } from "lucide-react";
import toast from "react-hot-toast";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE_NAME = "adiav";

interface User {
  id: number;
  username: string;
  password?: string;
  role: string;
  created_at: string;
}

const roles = ["superadmin", "admin", "supervisor"];

// Utility to get a color based on the role for the badge
const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case "superadmin":
      return "bg-purple-100 text-purple-800 border-purple-300";
    case "admin":
      return "bg-green-100 text-green-800 border-green-300";
    case "supervisor":
    default:
      return "bg-blue-100 text-blue-800 border-blue-300";
  }
};

// --- Sub-Component for Mobile (Card View) ---
interface UserCardListProps {
  users: User[];
  roles: string[];
  roleUpdatingId: number | null;
  updateRole: (id: number, role: string) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
}

const UserCardList: React.FC<UserCardListProps> = ({ users, roles, roleUpdatingId, updateRole, deleteUser }) => (
  <div className="space-y-4">
    {users.map((user) => (
      <div key={user.id} className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
        <div className="flex justify-between items-start border-b pb-3 mb-3">
          <div className="flex flex-col">
            <p className="text-xs text-slate-500 flex items-center gap-1"><Fingerprint className="w-3 h-3" /> User ID</p>
            <p className="text-lg font-bold text-slate-800 font-mono">{user.id}</p>
          </div>
          <button
            onClick={() => deleteUser(user.id)}
            className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 transition duration-150"
            title="Delete User"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-3">
          <p className="text-sm font-medium text-slate-600">Username</p>
          <p className="text-base text-slate-800">{user.username}</p>
        </div>

        <div className="mb-3">
          <p className="text-sm font-medium text-slate-600 flex items-center gap-1"><Calendar className="w-4 h-4" /> Created At</p>
          <p className="text-sm text-slate-500">{new Date(user.created_at).toLocaleString()}</p>
        </div>

        <div className="pt-2">
          <p className="text-sm font-medium text-slate-600 mb-1">Role</p>
          <div className="flex items-center gap-2">
            <select
              value={user.role}
              className={`p-2 border rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500 appearance-none font-semibold ${getRoleBadgeClass(user.role)} w-full`}
              onChange={(e) => updateRole(user.id, e.target.value)}
              disabled={roleUpdatingId === user.id}
            >
              {roles.map((r) => (
                <option key={r} value={r} className="bg-white text-slate-900">{r.toUpperCase()}</option>
              ))}
            </select>
            {roleUpdatingId === user.id && <Loader2 className="animate-spin w-4 h-4 text-blue-500 flex-shrink-0" />}
          </div>
        </div>
      </div>
    ))}
  </div>
);

// --- Sub-Component for Desktop (Table View) ---
const UserTable: React.FC<UserCardListProps & { loading: boolean }> = ({ users, roles, loading, roleUpdatingId, updateRole, deleteUser }) => (
  <div className="bg-white rounded-xl shadow-2xl overflow-x-auto border border-blue-50/50">
    <h2 className="text-2xl font-bold text-slate-700 p-6 flex items-center gap-2 border-b border-slate-100">
      Current Accounts
    </h2>
    <table className="min-w-full divide-y divide-slate-200 table-auto">
      <thead className="bg-slate-50 sticky top-0 z-10">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Username</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created At</th>
          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-slate-100">
        {loading ? (
          <tr>
            <td colSpan={5} className="text-center py-12">
              <Loader2 className="animate-spin mx-auto w-8 h-8 text-blue-600" />
              <p className="mt-2 text-slate-500">Loading users...</p>
            </td>
          </tr>
        ) : users.length === 0 ? (
          <tr>
            <td colSpan={5} className="text-center py-12 text-slate-500 italic">
              No users found. Add one above!
            </td>
          </tr>
        ) : (
          users.map((user) => (
            <tr key={user.id} className="hover:bg-blue-50 transition duration-150">
              <td className="px-4 py-3 text-sm font-mono text-slate-600">{user.id}</td>
              <td className="px-4 py-3 text-base font-medium text-slate-800">{user.username}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <select
                    value={user.role}
                    className={`p-2 border rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500 appearance-none font-semibold ${getRoleBadgeClass(user.role)}`}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                    disabled={roleUpdatingId === user.id}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r} className="bg-white text-slate-900">{r.toUpperCase()}</option>
                    ))}
                  </select>
                  {roleUpdatingId === user.id && <Loader2 className="animate-spin w-4 h-4 text-blue-500" />}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {new Date(user.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                <button
                  onClick={() => deleteUser(user.id)}
                  className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 transition duration-150"
                  title="Delete User"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);


// --- Main Component ---
export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "supervisor" });
  const [roleUpdatingId, setRoleUpdatingId] = useState<number | null>(null);
  
  // 1. New state and logic for dynamic rendering
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileView = useMemo(() => windowWidth < 640, [windowWidth]); // Tailwind's 'sm' breakpoint is 640px

  // --- Data Fetching and Mutation Functions (Unchanged Logic) ---

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=id,username,role,created_at`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateRole = async (id: number, role: string) => {
    setRoleUpdatingId(id);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: "return=representation" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      setUsers((prevUsers) => prevUsers.map((user) => (user.id === id ? { ...user, role } : user)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to update role.");
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user.");
    }
  };

  const addUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast("Username and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: "return=representation" },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) throw new Error("Failed to add user");
      setNewUser({ username: "", password: "", role: "supervisor" });
      await fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add user.");
    } finally {
      setLoading(false);
    }
  };

  const commonProps = { users, roles, roleUpdatingId, updateRole, deleteUser };

  return (
    <div className="min-h-screen bg-slate-50"> 
      <div className=" mx-auto p-4 lg:p-10">
        
<header className="mb-12  pt-2 pb-4 border-b-2 border-gray-300">
          <h1 className="text-2xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
            User Management Console
          </h1>
          <p className="text-gray-500 mt-2 italic text-lg">
            Manage user accounts, roles, and access permissions.
          </p>
        </header>
        {/* Add User Card */}
        <div className="bg-white rounded-xl shadow-2xl p-6 lg:p-8 mb-12 border border-blue-50/50">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-6 flex items-center gap-2">
            <UserPlus className="w-6 h-6" /> Create New Account
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Username"
              className="p-3 border border-slate-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 transition duration-150 shadow-sm"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password (required)"
              className="p-3 border border-slate-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 transition duration-150 shadow-sm"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
            <select
              className="p-3 border border-slate-300 rounded-lg w-full appearance-none bg-white focus:ring-blue-500 focus:border-blue-500 transition duration-150 shadow-sm"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r.toUpperCase()}</option>
              ))}
            </select>
            <button
              onClick={addUser}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="animate-spin w-5 h-5" />} Add User
            </button>
          </div>
        </div>

        {/* User Display - Conditional Rendering based on screen size */}
        {loading && users.length === 0 ? (
          <div className="bg-white rounded-xl shadow-2xl p-6 text-center py-12 border border-blue-50/50">
            <Loader2 className="animate-spin mx-auto w-8 h-8 text-blue-600" />
            <p className="mt-2 text-slate-500">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
           <div className="bg-white rounded-xl shadow-2xl p-6 text-center py-12 text-slate-500 italic border border-blue-50/50">
              No users found. Add one above!
           </div>
        ) : isMobileView ? (
          // Renders Card View for Mobile (no horizontal scrolling)
          <>
             <h2 className="text-2xl font-bold text-slate-700 mb-4 ml-2">Current Accounts</h2>
             <UserCardList {...commonProps} />
          </>
        ) : (
          // Renders Table View for Desktop (original design)
          <UserTable {...commonProps} loading={loading} />
        )}
      </div>
    </div>
  );
}