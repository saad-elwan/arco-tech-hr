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

  // Silent Pull-To-Refresh (no loading indicator)
  useEffect(() => {
    let startY = 0;
    let isAtTop = false;
    let pulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 5) {
        startY = e.touches[0].clientY;
        isAtTop = true;
      } else {
        isAtTop = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop) return;
      const distance = e.touches[0].clientY - startY;
      if (distance > 80) {
        pulling = true;
      }
    };

    const handleTouchEnd = () => {
      if (!isAtTop) return;
      if (pulling) {
        // Silent refresh - no visible indicator
        router.refresh();
        pulling = false;
      }
      isAtTop = false;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [router]);

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
