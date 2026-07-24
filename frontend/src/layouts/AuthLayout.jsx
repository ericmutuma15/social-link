import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function AuthLayout() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (isAuthenticated) return <Navigate to={location.state?.from?.pathname || "/home"} replace />;

  return (
    <main className="auth-layout">
      <div className="auth-orb auth-orb--one" />
      <div className="auth-orb auth-orb--two" />
      <Outlet />
    </main>
  );
}
