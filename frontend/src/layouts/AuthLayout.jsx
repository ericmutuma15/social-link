import { Outlet } from "react-router-dom";
export default function AuthLayout() { return <main className="auth-layout"><div className="auth-orb auth-orb--one" /><div className="auth-orb auth-orb--two" /><Outlet /></main>; }
