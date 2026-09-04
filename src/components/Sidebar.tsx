"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LayoutGrid, Users, Clock, CheckSquare, Star, RotateCcw, Building, BarChart3, Settings, LogOut, Banknote, MapPin, X, ClipboardList, User } from "lucide-react";

const adminNavItems = [
  {
    section: "الرئيسي",
    items: [
      { href: "/dashboard", label: "لوحة التحكم", icon: LayoutGrid },
    ],
  },
  {
    section: "الموارد البشرية",
    items: [
      { href: "/employees", label: "الموظفين", icon: Users },
      { href: "/attendance", label: "الحضور والانصراف", icon: Clock },
      { href: "/tracking", label: "تتبع المواقع", icon: MapPin },
      { href: "/tasks", label: "المهام", icon: CheckSquare },
      { href: "/evaluations", label: "التقييمات", icon: Star },
      { href: "/finance", label: "الماليات والرواتب", icon: Banknote },
    ],
  },
  {
    section: "التنظيم",
    items: [
      { href: "/shifts", label: "الورديات", icon: RotateCcw },
      { href: "/departments", label: "الأقسام", icon: Building },
    ],
  },
  {
    section: "النظام",
    items: [
      { href: "/profile", label: "حسابي", icon: User },
      { href: "/requests", label: "الطلبات والسلف", icon: ClipboardList },
      { href: "/reports", label: "التقارير", icon: BarChart3 },
      { href: "/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

const employeeNavItems = [
  {
    section: "بوابة الموظف",
    items: [
      { href: "/me", label: "حسابي", icon: LayoutGrid },
    ],
  },
];


export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; email: string; permissions?: string[] } | null>(null);
  const [companyName, setCompanyName] = useState("Arco Tech");
  const [empNav, setEmpNav] = useState(employeeNavItems);

  useEffect(() => {
    const userData = localStorage.getItem("hr_user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      // Defer setState to avoid synchronous setState in effect
      setTimeout(() => setUser(parsedUser), 0);
      
      if (parsedUser.role === "employee") {
        fetch("/api/me")
          .then(r => r.json())
          .then(d => {
            if (d.employee?.permissions) {
              const perms = typeof d.employee.permissions === 'string' ? JSON.parse(d.employee.permissions) : d.employee.permissions;
              const allPossibleItems = [
                { href: "/me", label: "حسابي", icon: LayoutGrid },
                { href: "/finance", label: "الماليات والرواتب", icon: Banknote },
                { href: "/tasks", label: "المهام", icon: CheckSquare },
                { href: "/attendance", label: "الحضور", icon: Clock },
                { href: "/tracking", label: "تتبع المواقع", icon: MapPin },
                { href: "/evaluations", label: "التقييمات", icon: Star },
                { href: "/requests", label: "الطلبات", icon: ClipboardList }
              ];
              const allowedItems = allPossibleItems.filter(item => perms.includes(item.href));
              setEmpNav([{ section: "بوابة الموظف", items: allowedItems }]);
            }
          }).catch(() => {});
      }
    }

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d?.name) setCompanyName(d.name); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("hr_token");
    localStorage.removeItem("hr_user");
    
    // Notify React Native WebView if it exists
    if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({ type: "LOGOUT" })
      );
    }
    
    router.replace("/");
  }

  const roleLabels: Record<string, string> = {
    superadmin: "المشرف العام (Super Admin)",
    admin: "المدير التنفيذي",
    hr: "إدارة الموارد البشرية",
    employee: "موظف",
    delegate: "🚗 مندوب ميداني",
  };

  const isDelegate = user?.role === "delegate";
  const isEmployee = user?.role === "employee";

  const delegateNavSections = [
    {
      section: "بوابة المندوب الميداني",
      items: [
        { href: "/me", label: "حسابي", icon: LayoutGrid }
      ]
    }
  ];

  // If delegate -> strictly only /me. If employee -> permissions. If admin/superadmin -> adminNav
  const navSections = isDelegate
    ? delegateNavSections
    : isEmployee
    ? empNav
    : adminNavItems.map(sec => {
        if (sec.section === "النظام" && user?.role === "superadmin") {
          const hasSuper = sec.items.some(i => i.href === "/super-admin");
          if (!hasSuper) {
            return {
              ...sec,
              items: [{ href: "/super-admin", label: "مراقبة الإشراف والأجهزة", icon: MapPin }, ...sec.items]
            };
          }
        }
        return sec;
      });

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{
      background: "linear-gradient(180deg, var(--bg-sidebar), rgba(5,5,5,1))",
      borderLeft: "1px solid rgba(var(--white-rgb),0.05)",
      boxShadow: "-10px 0 40px rgba(var(--black-rgb),0.8)"
    }}>
      <div className="sidebar-logo" style={{ 
        padding: "28px 24px", 
        borderBottom: "1px solid rgba(212, 175, 55, 0.15)",
        background: "radial-gradient(ellipse at top right, rgba(212,175,55,0.05), transparent 70%)"
      }}>
        <div className="sidebar-logo-icon" style={{
          width: 46, height: 46,
          background: "linear-gradient(135deg, var(--gold-dark), var(--gold-primary), var(--gold-light))",
          boxShadow: "0 8px 20px rgba(212, 175, 55, 0.25)"
        }}>
          <Building2 size={24} color="#000" />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title" style={{ fontSize: "16px", letterSpacing: "0.5px" }}>{companyName}</div>
          <div className="sidebar-logo-subtitle" style={{ fontSize: "12px", opacity: 0.8 }}>الإدارة الذكية للشركات</div>
        </div>
        {onClose && (
          <button 
            className="mobile-close-btn" 
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "none",
              padding: "4px"
            }}
          >
            <X size={24} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav" style={{ padding: "20px 16px" }}>
        {navSections.map((section) => (
          <div key={section.section} style={{ marginBottom: "16px" }}>
            <div className="nav-section-label" style={{ 
              fontSize: "11px", letterSpacing: "1.5px", color: "var(--gold-dark)",
              opacity: 0.8, marginBottom: "8px"
            }}>
              {section.section}
            </div>
            {section.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose?.()}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  style={{
                    padding: "12px 16px",
                    marginBottom: "4px",
                    borderRadius: "12px",
                    transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                    background: isActive ? "linear-gradient(90deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))" : "transparent",
                    border: isActive ? "1px solid rgba(212, 175, 55, 0.3)" : "1px solid transparent",
                    boxShadow: isActive ? "0 4px 15px rgba(var(--black-rgb),0.2)" : "none"
                  }}
                >
                  <span className="nav-icon" style={{ 
                    color: isActive ? "var(--gold-primary)" : "var(--text-secondary)",
                    transition: "color 0.3s"
                  }}>
                    <Icon size={20} />
                  </span>
                  <span style={{ 
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "var(--gold-light)" : "var(--text-secondary)",
                    fontSize: "14px"
                  }}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ 
        padding: "16px 20px", 
        background: "rgba(var(--black-rgb),0.3)",
        borderTop: "1px solid rgba(var(--white-rgb),0.05)"
      }}>
        <div className="sidebar-user" style={{ padding: "12px", borderRadius: "14px" }}>
          <div className="user-avatar" style={{ 
            width: 40, height: 40, 
            boxShadow: "0 4px 10px rgba(var(--black-rgb),0.5)"
          }}>
            {user?.name?.charAt(0) || "م"}
          </div>
          <div className="user-info">
             <div className="user-name" style={{ fontSize: "14px", fontWeight: 700 }}>{user?.name || "المستخدم"}</div>
             <div className="user-role" style={{ color: "var(--gold-dark)" }}>{roleLabels[user?.role || ""] || user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-icon"
            title="تسجيل الخروج"
            style={{ marginRight: "auto", color: "var(--danger)" }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
