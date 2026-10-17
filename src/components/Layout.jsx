import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout() {
  return (
    <div className="grain flex min-h-screen flex-col bg-[#f4f5fb] dark:bg-ink-950 text-slate-900 dark:text-slate-100">
      <Navbar />
      <main className="relative flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
