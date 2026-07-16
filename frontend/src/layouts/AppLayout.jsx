import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import RightSidebar from "../components/RightSidebar";
import BottomNavigation from "../components/BottomNavigation";
export default function AppLayout() {
  return (
    <div className="app-shell">
      <Header />
      <Sidebar />
      <main className="app-content">
        <Outlet />
      </main>
      <RightSidebar />
      <BottomNavigation />
    </div>
  );
}
