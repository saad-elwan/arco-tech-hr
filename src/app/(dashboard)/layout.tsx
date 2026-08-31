"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      const userData = localStorage.getItem("hr_user");
      if (userData) {
        const user = JSON.parse(userData);
        if (user.role === "delegate" && pathname !== "/me") {
          router.replace("/me");
        }
      }
    } catch {}
  }, [pathname, router]);

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}
      <main className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="page-container">{children}</div>
      </main>
    </div>
  );
}
