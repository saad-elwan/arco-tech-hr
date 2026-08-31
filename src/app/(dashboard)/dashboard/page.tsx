"use client";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Clock, AlertTriangle, UserCheck, CheckCircle, AlertCircle, FileText, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DashboardData, Evaluation, Attendance } from "@/types";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (!res.ok) {
          // If 401, middleware will redirect — just stop loading
          setLoading(false);
          return;
        }
        const data = await res.json();
        // If employee role, redirect to their own portal
        if (data?.role === "employee") {
          router.replace("/me");
          return;
        }
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  // Handle case where data is missing or failed
  if (!data || data.error) {
    return (
      <div style={{ textAlign: "center", padding: "50px", color: "var(--danger)" }}>
        <h2>حدث خطأ في تحميل البيانات</h2>
        <button onClick={() => window.location.reload()} className="btn btn-primary mt-4">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const { stats, chartData, tasksByStatus, topEmployees, recentActivity } = data;

  const total = stats?.totalEmployees || 0;
  const present = stats?.todayPresent || 0;
  const absent = stats?.todayAbsent || 0;
  const late = stats?.todayLate || 0;

  const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;
  const absentPct = total > 0 ? Math.round((absent / total) * 100) : 0;
  const latePct = total > 0 ? Math.round((late / total) * 100) : 0;

  const statCards = [
    { 
      label: "إجمالي الموظفين", 
      value: total, 
      icon: Users, 
      color: "gold", 
      trend: "100%", 
      trendType: "up",
      href: "/employees" 
    },
    { 
      label: "حاضر اليوم", 
      value: present, 
      icon: UserCheck, 
      color: "success", 
      trend: `${presentPct}%`, 
      trendType: presentPct >= 50 ? "up" : "down",
      href: "/attendance" 
    },
    { 
      label: "غائب اليوم", 
      value: absent, 
      icon: AlertTriangle, 
      color: "danger", 
      trend: `${absentPct}%`, 
      trendType: absentPct > 0 ? "down" : "up",
      href: "/attendance" 
    },
    { 
      label: "متأخر اليوم", 
      value: late, 
      icon: Clock, 
      color: "warning", 
      trend: `${latePct}%`, 
      trendType: latePct > 0 ? "down" : "up",
      href: "/attendance" 
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "20px", marginBottom: "30px" }}>
        <div>
          <h1 className="page-title" style={{ fontSize: "28px" }}>
            <span className="page-title-icon" style={{ background: "linear-gradient(135deg, var(--gold-dark), var(--gold-primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>✨</span> ملخص الأداء
          </h1>
          <p className="page-subtitle" style={{ fontSize: "15px", marginTop: "8px" }}>نظرة عامة احترافية على حالة النظام والموظفين اليوم</p>
        </div>
        <button className="btn btn-primary" onClick={() => router.push('/reports')} style={{ fontSize: "15px", padding: "10px 24px", borderRadius: "8px", boxShadow: "0 4px 15px var(--gold-glow)" }}>
          <FileText size={18} /> استخراج تقرير شامل
        </button>
      </div>

      <div className="stat-grid">
        {statCards.map((stat, i) => (
          <Link href={stat.href} key={i} style={{ textDecoration: "none" }}>
            <div className="stat-card" style={{ cursor: "pointer", transition: "transform 0.3s ease, box-shadow 0.3s ease" }}>
              <div className={`stat-icon ${stat.color}`}>
                <stat.icon />
              </div>
              <div className="stat-info">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
              <div className={`stat-change ${stat.trendType === "up" ? "up" : "down"}`}>
                {stat.trend}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="charts-grid">
        {/* Attendance Chart Card */}
        <div 
          className="card" 
          onClick={() => router.push('/attendance')}
          style={{ cursor: "pointer", transition: "all 0.3s ease" }}
          onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">📈</span> حضور الموظفين (الشهر الحالي)
            </h3>
            <ChevronLeft size={20} color="var(--text-muted)" />
          </div>
          <div className="card-body chart-container" style={{ pointerEvents: "none" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--gold-primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--gold-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--border-gold)', borderRadius: 8 }}
                  itemStyle={{ color: 'var(--gold-primary)' }}
                />
                <Area type="monotone" dataKey="count" name="الحاضرين" stroke="var(--gold-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tasks Stats Card */}
        <div 
          className="card"
          onClick={() => router.push('/tasks')}
          style={{ cursor: "pointer", transition: "all 0.3s ease" }}
          onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">📋</span> حالة المهام
            </h3>
            <ChevronLeft size={20} color="var(--text-muted)" />
          </div>
          <div className="card-body">
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', justifyContent: 'center' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>مهام مكتملة</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>{tasksByStatus?.completed || 0}</span>
                </div>
                <div className="progress-bar" style={{ height: "8px", borderRadius: "10px", background: "var(--bg-secondary)", overflow: "hidden" }}>
                  <div className="progress-fill" style={{ height: "100%", background: "linear-gradient(90deg, var(--success), #4ade80)", width: `${((tasksByStatus?.completed || 0) / Math.max(1, ((tasksByStatus?.completed||0) + (tasksByStatus?.new||0) + (tasksByStatus?.in_progress||0)))) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>قيد التنفيذ</span>
                  <span style={{ fontWeight: 700, color: 'var(--info)' }}>{tasksByStatus?.in_progress || 0}</span>
                </div>
                <div className="progress-bar" style={{ height: "8px", borderRadius: "10px", background: "var(--bg-secondary)", overflow: "hidden" }}>
                  <div className="progress-fill" style={{ height: "100%", background: "linear-gradient(90deg, var(--info), #60a5fa)", width: `${((tasksByStatus?.in_progress || 0) / Math.max(1, ((tasksByStatus?.completed||0) + (tasksByStatus?.new||0) + (tasksByStatus?.in_progress||0)))) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>مهام جديدة</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tasksByStatus?.new || 0}</span>
                </div>
                <div className="progress-bar" style={{ height: "8px", borderRadius: "10px", background: "var(--bg-secondary)", overflow: "hidden" }}>
                  <div className="progress-fill" style={{ height: "100%", background: "var(--border-strong)", width: `${((tasksByStatus?.new || 0) / Math.max(1, ((tasksByStatus?.completed||0) + (tasksByStatus?.new||0) + (tasksByStatus?.in_progress||0)))) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Top Employees Card */}
        <div 
          className="card"
          onClick={() => router.push('/evaluations')}
          style={{ cursor: "pointer", transition: "all 0.3s ease" }}
          onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">⭐️</span> أفضل الموظفين (تقييم الشهر)
            </h3>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={(e) => { e.stopPropagation(); router.push('/evaluations'); }}
            >
              عرض التقييمات الكاملة
            </button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>القسم</th>
                  <th>التقييم الكلي</th>
                </tr>
              </thead>
              <tbody>
                {(topEmployees || []).map((empEval: Evaluation, i: number) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="employee-avatar avatar-sm" style={{ background: "linear-gradient(135deg, var(--gold-dark), var(--gold-primary))", color: "#000", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                          {empEval.employee?.name?.charAt(0) || "م"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{empEval.employee?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>{empEval.employee?.department?.name || 'غير محدد'}</td>
                    <td>
                      <div className="badge badge-gold" style={{ fontSize: "14px", padding: "4px 10px" }}>
                        {empEval.totalScore}%
                      </div>
                    </td>
                  </tr>
                ))}
                {(!topEmployees || topEmployees.length === 0) && (
                  <tr>
                    <td colSpan={3} className="empty-state" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>لا توجد تقييمات هذا الشهر</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div 
          className="card"
          onClick={() => router.push('/attendance')}
          style={{ cursor: "pointer", transition: "all 0.3s ease" }}
          onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-title-icon">🕒</span> آخر نشاط حضور
            </h3>
            <ChevronLeft size={20} color="var(--text-muted)" />
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(recentActivity || []).map((act: Attendance, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: i < (recentActivity?.length || 0) - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div className={`btn-icon ${act.status === 'late' ? 'btn-danger' : 'btn-success'}`} style={{ opacity: 0.8, borderRadius: "50%" }}>
                    {act.status === 'late' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{act.employee?.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{act.checkIn || act.checkOut}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {act.status === 'late' ? 'تأخير' : 'تسجيل حضور'} - {act.source === 'fingerprint' ? 'بصمة' : 'يدوي'}
                    </div>
                  </div>
                </div>
              ))}
              {(!recentActivity || recentActivity.length === 0) && (
                <div className="empty-state" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>لا يوجد نشاط مسجل اليوم</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
