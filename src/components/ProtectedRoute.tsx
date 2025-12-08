import { useEffect, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // optional: roles allowed for this route
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const verifyAccess = async () => {
      const cookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith("username="));

      if (!cookie) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      const username = cookie.split("=")[1];

      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/adiav?username=eq.${username}&select=id,username,role`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        const data = await res.json();

        if (!data.length) {
          setIsAuthorized(false);
          return;
        }

        const { role } = data[0];

        // Check allowedRoles if defined
        if (allowedRoles && !allowedRoles.includes(role)) {
          setIsAuthorized(false);
          return;
        }

        setIsAuthorized(true);

      } catch (err) {
        console.error("Access verification failed:", err);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAccess();
  }, [location.pathname, allowedRoles]);

  if (isLoading) return null;

  // Redirect unauthorized users
  if (!isAuthorized) return <Navigate to="/report-submission" replace />;

  return <>{children}</>;
}
