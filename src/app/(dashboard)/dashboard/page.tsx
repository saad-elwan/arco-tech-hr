"use client";
import useSWR from "swr";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, Clock, AlertTriangle, UserCheck, CheckCircle, AlertCircle, FileText, ChevronLeft, TrendingUp, TrendingDown, Activity, Award, Briefcase, PieChart as PieChartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { DashboardData, Evaluation, Attendance } from "@/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("Unauthorized");
    throw new Error("Failed to fetch");
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error("Invalid JSON response");
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

export default function Dashboard() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR<DashboardData>("/api/dashboard", fetcher, { 
    refreshInterval: 15000, 
    revalidateOnFocus: true
  });

  if (data?.role === "employee") {
    router.replace("/me");
    return null;
  }

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !data || data.error) {
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
    { label: "إجمالي الموظفين", value: total, icon: Users, color: "var(--gold-primary)", bg: "rgba(212, 175, 55, 0.1)", trend: "100%", trendType: "up", href: "/employees" },
    { label: "حاضر اليوم", value: present, icon: UserCheck, color: "var(--success)", bg: "rgba(16, 185, 129, 0.1)", trend: `${presentPct}%`, trendType: presentPct >= 50 ? "up" : "down", href: "/attendance" },
    { label: "غائب اليوم", value: absent, icon: AlertTriangle, color: "var(--danger)", bg: "rgba(239, 68, 68, 0.1)", trend: `${absentPct}%`, trendType: absentPct > 0 ? "down" : "up", href: "/attendance" },
    { label: "متأخر اليوم", value: late, icon: Clock, color: "var(--warning)", bg: "rgba(245, 158, 11, 0.1)", trend: `${latePct}%`, trendType: latePct > 0 ? "down" : "up", href: "/attendance" },
  ];

  const pieData = [
    { name: 'حاضر', value: present, color: '#10b981' },
    { name: 'غائب', value: absent, color: '#ef4444' },
    { name: 'متأخر', value: late, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ paddingBottom: '40px' }}>
      
      {/* HEADER SECTION */}
      <motion.div variants={itemVariants} className="page-header glass-panel" style={{ padding: "24px", marginBottom: "30px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-gold)" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: "28px", display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '12px', display: 'flex' }}>
                <Activity size={28} style={{ color: 'var(--gold-primary)' }} />
              </span> 
              اللوحة الذكية للإدارة
            </h1>
            <p className="page-subtitle" style={{ fontSize: "15px", marginTop: "8px" }}>مرحباً بعودتك! إليك ملخص الأداء المباشر لهذا اليوم.</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary" onClick={() => router.push('/reports')} style={{ fontSize: "15px", padding: "12px 28px", borderRadius: "12px", boxShadow: "0 4px 20px var(--gold-glow)", display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} /> تقرير تحليلي شامل
          </motion.button>
        </div>
      </motion.div>

      {/* STAT CARDS */}
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "30px" }}>
        {statCards.map((stat, i) => (
          <Link href={stat.href} key={i} style={{ textDecoration: "none" }}>
            <motion.div variants={itemVariants} whileHover={{ y: -8, boxShadow: '0 12px 30px rgba(var(--black-rgb), 0.2)' }} className="card glass-panel" style={{ cursor: "pointer", padding: "24px", display: 'flex', flexDirection: 'column', gap: '16px', borderTop: `4px solid ${stat.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <stat.icon size={24} style={{ color: stat.color }} />
                </div>
                <div className={`stat-change ${stat.trendType === "up" ? "up" : "down"}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '20px', fontSize: '13px' }}>
                  {stat.trendType === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {stat.trend}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>{stat.label}</div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '24px', marginBottom: '30px' }}>
        
        {/* AREA CHART - MONTHLY ATTENDANCE */}
        <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <Activity size={20} style={{ color: 'var(--gold-primary)' }} />
              مؤشر الحضور (الشهر الحالي)
            </h3>
            <button onClick={() => router.push('/attendance')} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              التفاصيل <ChevronLeft size={16} />
            </button>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--gold-primary)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--gold-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--border-gold)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="count" name="الحاضرين" stroke="var(--gold-primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* PIE CHART - TODAY'S DISTRIBUTION */}
        <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <PieChartIcon size={20} style={{ color: 'var(--gold-primary)' }} />
              التوزيع اليومي للموظفين
            </h3>
          </div>
          {pieData.length > 0 ? (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="var(--bg-card)"
                    strokeWidth={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--border)', borderRadius: '12px' }}
                    itemStyle={{ fontWeight: 'bold', color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              لا توجد بيانات حضور لليوم
            </div>
          )}
        </motion.div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '24px' }}>
        
        {/* RECENT ACTIVITY TIMELINE */}
        <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <Clock size={20} style={{ color: 'var(--gold-primary)' }} />
              آخر النشاطات (Timeline)
            </h3>
            <button onClick={() => router.push('/attendance')} className="btn btn-ghost btn-sm">عرض السجل</button>
          </div>
          <div style={{ position: 'relative', paddingRight: '20px' }}>
            {/* Vertical Line */}
            <div style={{ position: 'absolute', right: '7px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border)' }}></div>
            
            {(recentActivity || []).length > 0 ? (recentActivity || []).slice(0, 5).map((act: Attendance, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + (i * 0.1) }} style={{ position: 'relative', marginBottom: '24px' }}>
                <div style={{ position: 'absolute', right: '-25px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', background: act.status === 'late' ? 'var(--warning)' : 'var(--success)', border: '4px solid var(--bg-card)' }}></div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{act.employee?.name || 'مستخدم غير معروف'}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {act.checkIn ? new Date(act.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {act.status === 'late' ? 'سجل حضور متأخر' : 'سجل حضور في الموعد'}
                  </div>
                </div>
              </motion.div>
            )) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>لا توجد نشاطات مؤخراً</div>
            )}
          </div>
        </motion.div>

        {/* TOP EMPLOYEES & TASKS PROGRESS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <Briefcase size={20} style={{ color: 'var(--gold-primary)' }} />
                تقدم المهام والمشاريع
              </h3>
              <button onClick={() => router.push('/tasks')} className="btn btn-ghost btn-sm">إدارة المهام</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>مهام مكتملة</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>{tasksByStatus?.completed || 0}</span>
                </div>
                <div className="progress-bar" style={{ height: "10px", borderRadius: "10px", background: "var(--bg-secondary)", overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${((tasksByStatus?.completed || 0) / Math.max(1, ((tasksByStatus?.completed||0) + (tasksByStatus?.new||0) + (tasksByStatus?.in_progress||0)))) * 100}%` }} transition={{ duration: 1, delay: 0.5 }} style={{ height: "100%", background: "linear-gradient(90deg, var(--success), #4ade80)" }}></motion.div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>قيد التنفيذ</span>
                  <span style={{ fontWeight: 700, color: 'var(--info)' }}>{tasksByStatus?.in_progress || 0}</span>
                </div>
                <div className="progress-bar" style={{ height: "10px", borderRadius: "10px", background: "var(--bg-secondary)", overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${((tasksByStatus?.in_progress || 0) / Math.max(1, ((tasksByStatus?.completed||0) + (tasksByStatus?.new||0) + (tasksByStatus?.in_progress||0)))) * 100}%` }} transition={{ duration: 1, delay: 0.7 }} style={{ height: "100%", background: "linear-gradient(90deg, var(--info), #60a5fa)" }}></motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="card glass-panel" style={{ padding: '24px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <Award size={20} style={{ color: 'var(--gold-primary)' }} />
                نجوم الشهر (التقييمات)
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(topEmployees || []).length > 0 ? (topEmployees || []).map((empEval: Evaluation, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold-primary))', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                      {(empEval.employee?.name || 'م').charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{empEval.employee?.name || 'مستخدم غير معروف'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{empEval.employee?.department?.name || 'غير محدد'}</div>
                    </div>
                  </div>
                  <div className="badge badge-gold" style={{ fontSize: '15px', padding: '6px 12px' }}>
                    {empEval.totalScore}%
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>لا توجد تقييمات هذا الشهر</div>
              )}
            </div>
          </motion.div>
          
        </div>
      </div>
    </motion.div>
  );
}
