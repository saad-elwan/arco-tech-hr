"use client";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Loader2, Info, AlertTriangle, CheckCircle, Menu } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { playNotificationSound, requestNotificationPermission, showBrowserNotification } from "@/lib/audioNotifications";

const pageTitles: Record<string, string> = {
  "/dashboard": "لوحة التحكم",
  "/employees": "إدارة الموظفين",
  "/attendance": "سجل الحضور والانصراف",
  "/tasks": "إدارة المهام والمشاريع",
  "/evaluations": "تقييمات الأداء",
  "/shifts": "نظام الورديات",
  "/departments": "الهيكل التنظيمي",
  "/reports": "التقارير التحليلية",
  "/settings": "إعدادات النظام",
};

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname] || "نظام الإدارة المتكامل";

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifsLoaded, setNotifsLoaded] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<{ role?: string } | null>(null);

  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const userData = localStorage.getItem("hr_user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {}
    }
  }, []);

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [toastNotif, setToastNotif] = useState<any>(null);

  // Auto-request Notification permission on user interaction
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        const reqPerm = () => {
          Notification.requestPermission().catch(() => {});
          window.removeEventListener("click", reqPerm);
          window.removeEventListener("touchstart", reqPerm);
        };
        window.addEventListener("click", reqPerm, { once: true });
        window.addEventListener("touchstart", reqPerm, { once: true });
      }
    }
  }, []);

  // Admin / HR Presence & Heartbeat to Super Admin
  useEffect(() => {
    if (!user || !["admin", "superadmin", "hr"].includes(user.role?.toLowerCase() || "")) return;

    const reportPresence = () => {
      const sendData = (lat: number | null, lng: number | null) => {
        const isMobile = typeof navigator !== "undefined" && (/android|iphone|ipad|mobile/i.test(navigator.userAgent));
        fetch("/api/superadmin/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat,
            lng,
            deviceName: isMobile ? "هاتف ذكي (Mobile)" : "كمبيوتر مكتبي (Desktop)"
          })
        }).catch(() => {});
      };

      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => sendData(pos.coords.latitude, pos.coords.longitude),
          () => sendData(null, null),
          { timeout: 6000 }
        );
      } else {
        sendData(null, null);
      }
    };

    reportPresence();
    const presenceInterval = setInterval(reportPresence, 30000);
    return () => clearInterval(presenceInterval);
  }, [user]);

  // Real-time Notifications Polling (every 4 seconds)
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    const checkNotifs = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const d = await res.json();
        const notifs: any[] = d.notifications || [];
        const count = d.unreadCount || 0;

        if (isFirstLoadRef.current) {
          notifs.forEach((n) => seenNotifIdsRef.current.add(String(n.id)));
          isFirstLoadRef.current = false;
        } else {
          // Detect any newly arrived unread notification
          const brandNew = notifs.filter((n) => !seenNotifIdsRef.current.has(String(n.id)) && !n.isRead);
          if (brandNew.length > 0) {
            const latest = brandNew[0];
            brandNew.forEach((n) => seenNotifIdsRef.current.add(String(n.id)));

            // 1. Play audio chime
            playNotificationSound();

            // 2. In-App Floating Toast Notification Popup
            setToastNotif(latest);
            setTimeout(() => setToastNotif(null), 8000);

            // 3. Native Browser / Lockscreen Notification
            showBrowserNotification(latest.title, {
              body: latest.desc || latest.body || latest.message || "لديك إشعار جديد في النظام",
              link: latest.link || "/dashboard"
            });
          }
        }

        setNotifications(notifs);
        setUnreadCount(count);
      } catch {}
    };

    checkNotifs();
    const interval = setInterval(checkNotifs, 4000);
    return () => clearInterval(interval);
  }, []);

  // Send background poll starter to service worker
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: "START_BG_POLL" });
      }).catch(() => {});
    }
  }, []);

  // Toggle notifications dropdown and mark all as read
  const handleNotifsClick = () => {
    const nextState = !showNotifs;
    setShowNotifs(nextState);
    if (nextState) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
    }
  };

  // Handle individual notification click (marks as read immediately)
  const handleNotificationItemClick = (n: any) => {
    setShowNotifs(false);
    setNotifications((prev) => prev.map((item) => item.id === n.id ? { ...item, isRead: true } : item));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id }),
    }).catch(() => {});
    if (n.link) router.push(n.link);
  };

  // Handle toast notification click
  const handleToastClick = () => {
    if (!toastNotif) return;
    const link = toastNotif.link || "/dashboard";
    const id = toastNotif.id;
    setToastNotif(null);
    if (id) {
      setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, isRead: true } : item));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => {});
    }
    router.push(link);
  };

  // Handle Search using debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          setSearchResults(data.results || []);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="header" style={{
      background: "rgba(10, 10, 10, 0.8)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(212, 175, 55, 0.15)",
      boxShadow: "0 4px 30px rgba(0, 0, 0, 0.5)",
      padding: "0 32px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {onMenuClick && (
          <button 
            onClick={onMenuClick} 
            className="mobile-menu-btn" 
            style={{ 
              background: "transparent", 
              border: "none", 
              color: "var(--text-primary)",
              cursor: "pointer",
              padding: "4px",
              display: "none" // Will show in CSS
            }}
          >
            <Menu size={24} />
          </button>
        )}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h2 className="header-title" style={{ 
          fontSize: "20px", 
          fontWeight: 800, 
          letterSpacing: "0.5px",
          background: "linear-gradient(135deg, #fff, var(--gold-light))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          margin: 0,
          lineHeight: 1.3,
          paddingBottom: "2px"
        }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>{dateStr}</p>
      </div>
      </div>

      <div className="header-actions" style={{ gap: "20px" }}>
        
        {/* Active Search Bar */}
        {user?.role !== "employee" && (
          <div ref={searchRef} style={{ position: "relative" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "20px",
              width: "280px",
              transition: "all 0.3s",
              boxShadow: showSearchDropdown ? "0 0 15px rgba(212, 175, 55, 0.15)" : "none",
              borderColor: showSearchDropdown ? "rgba(212, 175, 55, 0.4)" : "rgba(255,255,255,0.1)"
            }}>
              <Search size={16} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="ابحث عن موظف، قسم، أو مهمة..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  width: "100%",
                  direction: "rtl"
                }}
              />
            </div>

            {/* Search Dropdown */}
            {showSearchDropdown && searchQuery.trim().length > 0 && (
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: "12px",
                width: "100%", background: "var(--bg-modal)",
                borderRadius: "16px", border: "1px solid var(--border-gold)",
                boxShadow: "var(--shadow-modal)", zIndex: 100,
                padding: "12px 0", overflow: "hidden"
              }}>
                {isSearching ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                    <Loader2 size={24} className="spinner" style={{ margin: "auto" }} />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    {searchResults.map((res: any, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                          router.push(res.link);
                        }}
                        style={{
                          padding: "12px 20px", borderBottom: idx < searchResults.length - 1 ? "1px solid var(--border)" : "none",
                          cursor: "pointer", display: "flex", flexDirection: "column",
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "var(--gold-subtle)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{res.title}</span>
                        <span style={{ fontSize: 11, color: "var(--gold-primary)" }}>{res.subtitle}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    لا توجد نتائج بحث مطابقة.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          background: "linear-gradient(90deg, rgba(212, 175, 55, 0.1), rgba(0,0,0,0))",
          border: "1px solid rgba(212, 175, 55, 0.2)",
          borderRadius: "20px",
          fontSize: 13,
          color: "var(--gold-primary)",
          fontWeight: 700,
        }}>
          <span style={{ 
            width: 8, height: 8, borderRadius: "50%", 
            background: "var(--success)", 
            display: "inline-block",
            boxShadow: "0 0 8px var(--success)"
          }} />
          النظام يعمل
        </div>

        {/* Notifications Popover */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button 
            className="btn-icon" 
            onClick={handleNotifsClick}
            style={{
              background: showNotifs ? "rgba(212, 175, 55, 0.1)" : "rgba(255,255,255,0.05)",
              border: showNotifs ? "1px solid rgba(212, 175, 55, 0.4)" : "1px solid rgba(255,255,255,0.1)",
              width: 40, height: 40, borderRadius: "50%",
              position: "relative", cursor: "pointer", transition: "all 0.3s"
            }}
          >
            <Bell size={18} color={showNotifs ? "var(--gold-primary)" : "var(--text-primary)"} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: -2, right: -2,
                minWidth: 18, height: 18, background: "var(--danger)",
                borderRadius: "9px", border: "2px solid var(--bg-secondary)",
                fontSize: 11, fontWeight: 700, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 4px"
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div style={{
              position: "absolute", top: "100%", left: 0, marginTop: "12px",
              width: "320px", background: "var(--bg-modal)",
              borderRadius: "16px", border: "1px solid var(--border-gold)",
              boxShadow: "var(--shadow-modal)", zIndex: 100, overflow: "hidden"
            }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-gold)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0, fontSize: 15, color: "var(--gold-primary)" }}>الإشعارات الحديثة</h4>
                <button
                  onClick={() => {
                    setUnreadCount(0);
                    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
                    fetch("/api/notifications", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                    }).catch(() => {});
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "11px",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontFamily: "inherit"
                  }}
                >
                  تحديد الكل كمقروء
                </button>
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto", padding: "8px 0" }}>
                {notifications.length > 0 ? notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationItemClick(n)}
                    style={{
                      padding: "16px 20px", borderBottom: "1px solid var(--border)",
                      display: "flex", gap: "12px", alignItems: "flex-start", cursor: "pointer",
                      background: n.isRead === false ? "rgba(212, 175, 55, 0.08)" : "transparent"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "var(--gold-subtle)"}
                    onMouseOut={(e) => e.currentTarget.style.background = n.isRead === false ? "rgba(212, 175, 55, 0.08)" : "transparent"}
                  >
                    <div style={{ marginTop: 2 }}>
                      {n.type === "danger" ? <AlertTriangle size={16} color="var(--danger)" /> :
                       n.type === "warning" ? <AlertTriangle size={16} color="var(--warning)" /> :
                       <Info size={16} color="var(--info)" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{n.desc}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    لا توجد أي إشعارات جديدة حالياً 🔕
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Live In-App Toast Popup Notification (Desktop & Mobile) */}
      {toastNotif && (
        <div 
          onClick={handleToastClick}
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            maxWidth: "460px",
            width: "calc(100% - 32px)",
            background: "rgba(14, 18, 26, 0.95)",
            border: "1.5px solid var(--gold-primary)",
            borderRadius: "16px",
            padding: "16px 20px",
            boxShadow: "0 15px 40px rgba(0,0,0,0.6), 0 0 25px rgba(212, 175, 55, 0.35)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
            animation: "slideIn 0.3s ease"
          }}
        >
          <div style={{
            width: "38px", height: "38px", borderRadius: "10px",
            background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(2,132,199,0.2))",
            border: "1px solid var(--gold-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, color: "var(--gold-primary)"
          }}>
            <Bell size={20} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <strong style={{ fontSize: "14px", color: "var(--gold-primary)" }}>{toastNotif.title}</strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>الآن</span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5, wordBreak: "break-word" }}>
              {toastNotif.desc || toastNotif.body || toastNotif.message || "لديك إشعار جديد في النظام"}
            </p>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setToastNotif(null);
            }}
            style={{
              background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px"
            }}
          >
            ✕
          </button>
        </div>
      )}
    </header>
  );
}
