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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);

  // Touch Pull-To-Refresh Gesture Handler
  useEffect(() => {
    let startY = 0;
    let isAtTop = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 5) {
        startY = e.touches[0].clientY;
        isAtTop = true;
      } else {
        isAtTop = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY;
      if (distance > 0 && distance < 140) {
        setPullY(distance);
      }
    };

    const handleTouchEnd = () => {
      if (!isAtTop) return;
      if (pullY > 70 && !isRefreshing) {
        setIsRefreshing(true);
        setPullY(60);
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } else {
        setPullY(0);
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
  }, [pullY, isRefreshing]);

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Pull To Refresh Indicator */}
      {pullY > 0 && (
        <div
          style={{
            position: "fixed",
            top: `${Math.min(pullY - 10, 70)}px`,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "rgba(18, 18, 18, 0.95)",
            border: "1px solid var(--gold-primary)",
            borderRadius: "50px",
            padding: "8px 18px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--gold-primary)",
            fontSize: "13px",
            fontWeight: "bold",
            boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(212,175,55,0.3)",
            transition: isRefreshing ? "all 0.3s ease" : "none",
          }}
        >
          <div
            style={{
              width: "16px",
              height: "16px",
              border: "2px solid rgba(212,175,55,0.2)",
              borderTopColor: "var(--gold-primary)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          {isRefreshing ? "جاري التحديث..." : "اسحب للإفلات والتحديث"}
        </div>
      )}

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
