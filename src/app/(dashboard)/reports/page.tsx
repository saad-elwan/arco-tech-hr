"use client";
import { useEffect, useState, useRef } from "react";
import { Download, FileText, Calendar, Filter, Users, Clock, CheckCircle, Star } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("attendance");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState("");
  const [filterEmp, setFilterEmp] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [hasFiltered, setHasFiltered] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/departments").then(r => r.json()).then(d => { if (Array.isArray(d)) setDepartments(d); });
    fetch("/api/employees").then(r => r.json()).then(d => { if (Array.isArray(d)) setEmployees(d); });
  }, []);

  const handleFilter = async () => {
    setLoading(true);
    setHasFiltered(true);
    try {
      let url = "";
      if (reportType === "attendance") {
        const month = fromDate.substring(0, 7);
        url = `/api/attendance?month=${month}${filterEmp ? `&employeeId=${filterEmp}` : ""}`;
      } else if (reportType === "employees") {
        url = `/api/employees${filterDept ? `?department=${filterDept}` : ""}`;
      } else if (reportType === "evaluations") {
        const month = fromDate.substring(0, 7);
        url = `/api/evaluations?period=${month}${filterEmp ? `&employeeId=${filterEmp}` : ""}`;
      } else if (reportType === "tasks") {
        url = `/api/tasks${filterEmp ? `?assignedTo=${filterEmp}` : ""}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setReportData(data);
      else setReportData([]);
    } catch {
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    if (!reportData.length) return alert("لا توجد بيانات للتصدير");
    let csv = "";
    if (reportType === "attendance") {
      csv = "الموظف,القسم,التاريخ,وقت الحضور,وقت الانصراف,الحالة\n";
      reportData.forEach((r: any) => {
        csv += `"${r.employee?.name || ""}","${r.employee?.department?.name || ""}","${r.date}","${r.checkIn || ""}","${r.checkOut || ""}","${r.status}"\n`;
      });
    } else if (reportType === "employees") {
      csv = "الاسم,البريد,القسم,الوردية,تاريخ التعيين,الحالة,الراتب\n";
      reportData.forEach((e: any) => {
        csv += `"${e.name}","${e.email}","${e.department?.name || ""}","${e.shift?.name || ""}","${e.hireDate?.substring(0, 10) || ""}","${e.status}","${e.basicSalary || 0}"\n`;
      });
    } else if (reportType === "evaluations") {
      csv = "الموظف,القسم,التقييم العام,الحضور,المهام\n";
      reportData.forEach((ev: any) => {
        csv += `"${ev.employee?.name || ""}","${ev.employee?.department?.name || ""}","${ev.totalScore}%","${ev.attendanceScore}%","${ev.tasksScore}%"\n`;
      });
    } else if (reportType === "tasks") {
      csv = "العنوان,المكلف,الأولوية,الحالة,تاريخ الإنشاء\n";
      reportData.forEach((t: any) => {
        csv += `"${t.title}","${t.assignee?.name || ""}","${t.priority}","${t.status}","${t.createdAt?.substring(0, 10) || ""}"\n`;
      });
    }
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_${reportType}_${new Date().toLocaleDateString("en-CA")}.csv`;
    link.click();
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return alert("لا توجد بيانات للتصدير");
    if (!reportData.length) return alert("لا توجد بيانات للتصدير");
    try {
      setLoading(true);
      // Wait for render
      await new Promise(r => setTimeout(r, 500));
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`تقرير_${reportType}_${new Date().toLocaleDateString("en-CA")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء إنشاء ملف PDF");
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    { value: "attendance", label: "تقرير الحضور والانصراف", icon: <Clock size={16} /> },
    { value: "evaluations", label: "تقرير التقييمات والأداء", icon: <Star size={16} /> },
    { value: "tasks", label: "تقرير المهام المنجزة", icon: <CheckCircle size={16} /> },
    { value: "employees", label: "بيانات الموظفين", icon: <Users size={16} /> },
  ];

  const renderTable = () => {
    if (!hasFiltered) return null;
    if (loading) return <div className="loading-spinner" style={{ minHeight: 200 }}><div className="spinner"></div></div>;
    if (!reportData.length) return (
      <div className="empty-state" style={{ minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <FileText size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
        <h3>لا توجد بيانات للعرض</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>حاول تغيير فترة البحث أو الفلاتر</p>
      </div>
    );

    if (reportType === "attendance") {
      return (
        <table style={{ width: "100%", textAlign: "right", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["الموظف", "القسم", "التاريخ", "وقت الحضور", "وقت الانصراف", "الحالة"].map(h => (
                <th key={h} style={{ padding: "12px 16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportData.map((r: any) => (
              <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.employee?.name}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 13 }}>{r.employee?.department?.name || "-"}</td>
                <td style={{ padding: "12px 16px" }}>{r.date}</td>
                <td style={{ padding: "12px 16px", color: r.status === "late" ? "var(--warning)" : "var(--text-primary)" }}>{r.checkIn || "---"}</td>
                <td style={{ padding: "12px 16px" }}>{r.checkOut || "---"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span className={`badge badge-${r.status === "present" ? "success" : r.status === "late" ? "warning" : "danger"}`}>
                    {r.status === "present" ? "حاضر" : r.status === "late" ? "متأخر" : r.status === "absent" ? "غائب" : r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (reportType === "employees") {
      return (
        <table style={{ width: "100%", textAlign: "right", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["الاسم", "القسم", "الوردية", "تاريخ التعيين", "الراتب الأساسي", "الحالة"].map(h => (
                <th key={h} style={{ padding: "12px 16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportData.map((e: any) => (
              <tr key={e.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{e.name}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{e.department?.name || "-"}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{e.shift?.name || "-"}</td>
                <td style={{ padding: "12px 16px" }}>{e.hireDate ? new Date(e.hireDate).toLocaleDateString("ar-EG") : "-"}</td>
                <td style={{ padding: "12px 16px", color: "var(--gold-primary)", fontWeight: 600 }}>{e.basicSalary?.toLocaleString("ar-EG") || 0} ج.م</td>
                <td style={{ padding: "12px 16px" }}>
                  <span className={`badge badge-${e.status === "active" ? "success" : "danger"}`}>
                    {e.status === "active" ? "نشط" : e.status === "leave" ? "إجازة" : "موقوف"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (reportType === "evaluations") {
      return (
        <table style={{ width: "100%", textAlign: "right", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["الموظف", "القسم", "التقييم العام", "الحضور", "المهام"].map(h => (
                <th key={h} style={{ padding: "12px 16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportData.map((ev: any) => (
              <tr key={ev.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{ev.employee?.name}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{ev.employee?.department?.name || "-"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontWeight: 700, color: ev.totalScore >= 75 ? "var(--success)" : ev.totalScore >= 50 ? "var(--warning)" : "var(--danger)" }}>
                    {ev.totalScore}%
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>{ev.attendanceScore}%</td>
                <td style={{ padding: "12px 16px" }}>{ev.tasksScore}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (reportType === "tasks") {
      const statusMap: Record<string, string> = { new: "جديدة", in_progress: "قيد التنفيذ", completed: "مكتملة", overdue: "متأخرة" };
      const priorityMap: Record<string, string> = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
      return (
        <table style={{ width: "100%", textAlign: "right", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["العنوان", "المكلف", "الأولوية", "الحالة", "تاريخ الإنشاء"].map(h => (
                <th key={h} style={{ padding: "12px 16px", color: "var(--gold-primary)", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportData.map((t: any) => (
              <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{t.title}</td>
                <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{t.assignee?.name || "-"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span className={`badge badge-${t.priority === "high" ? "danger" : t.priority === "medium" ? "warning" : "success"}`}>
                    {priorityMap[t.priority] || t.priority}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span className={`badge badge-${t.status === "completed" ? "success" : t.status === "in_progress" ? "info" : t.status === "overdue" ? "danger" : "muted"}`}>
                    {statusMap[t.status] || t.status}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 13 }}>{new Date(t.createdAt).toLocaleDateString("ar-EG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  const getReportTitle = () => {
    switch (reportType) {
      case "attendance": return "تقرير الحضور والانصراف";
      case "employees": return "بيانات الموظفين";
      case "evaluations": return "تقرير التقييمات والأداء";
      case "tasks": return "تقرير المهام المنجزة";
      default: return "تقرير";
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="page-title-icon">📊</span> التقارير والإحصائيات
          </h1>
          <p className="page-subtitle">استخراج تقارير النظام الشاملة وتصديرها</p>
        </div>
      </div>

      {/* Report Type Selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        {reportTypes.map(rt => (
          <button
            key={rt.value}
            onClick={() => { setReportType(rt.value); setHasFiltered(false); setReportData([]); }}
            style={{
              padding: "16px",
              borderRadius: "12px",
              border: reportType === rt.value ? "2px solid var(--gold-primary)" : "1px solid var(--border)",
              background: reportType === rt.value ? "rgba(212,175,55,0.1)" : "var(--bg-card)",
              color: reportType === rt.value ? "var(--gold-primary)" : "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: reportType === rt.value ? 700 : 400,
              transition: "all 0.2s",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          >
            {rt.icon} {rt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <h3 className="settings-section-title" style={{ marginTop: 0 }}>تخصيص التقرير</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, alignItems: "end" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">من تاريخ</label>
            <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">إلى تاريخ</label>
            <input type="date" className="form-control" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">القسم</label>
            <select className="form-control" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">كل الأقسام</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">الموظف</label>
            <select className="form-control" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
              <option value="">كل الموظفين</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{ height: "42px", alignSelf: "end" }} onClick={handleFilter} disabled={loading}>
            <Filter size={16} /> {loading ? "جاري التحميل..." : "عرض التقرير"}
          </button>
        </div>
      </div>

      {/* Actions */}
      {hasFiltered && reportData.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={handleExportPDF} disabled={loading} style={{ background: '#d4af37', color: '#000', borderColor: '#d4af37' }}>
            <Download size={16} /> تصدير PDF احترافي
          </button>
          <button className="btn btn-primary" style={{ background: 'var(--success)', color: 'white', borderColor: 'var(--success)' }} onClick={handleExportCSV}>
            <Download size={16} /> تصدير Excel (CSV)
          </button>
        </div>
      )}

      <div className="card">
        <div className="table-wrapper">
          {!hasFiltered ? (
            <div className="empty-state" style={{ minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <h3 className="empty-state-title">منطقة عرض التقرير</h3>
              <p className="empty-state-desc">قم باختيار نوع التقرير والفلاتر ثم اضغط على &quot;عرض التقرير&quot;</p>
            </div>
          ) : renderTable()}
        </div>
      </div>

      {/* Hidden printable area for PDF export */}
      <div style={{ position: "fixed", top: 0, left: "-10000px", width: "1000px", background: "white", zIndex: -1 }}>
        <div
          ref={printRef}
          dir="rtl"
          style={{
            width: "1000px",
            padding: "40px",
            background: "white",
            fontFamily: "Arial, sans-serif",
            direction: "rtl",
            color: "#000",
          }}
        >
          {/* Header */}
          <div style={{ background: "#1a365d", padding: "30px", margin: "-40px -40px 30px -40px", textAlign: "center" }}>
            <h1 style={{ color: "white", fontSize: "28px", margin: "0 0 10px 0" }}>نظام إدارة الموارد البشرية</h1>
            <p style={{ color: "#c9a227", fontSize: "16px", margin: 0 }}>{getReportTitle()}</p>
          </div>

          {/* Info */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", fontSize: "14px", color: "#666" }}>
            <span>تاريخ الإصدار: {new Date().toLocaleDateString("ar-EG")}</span>
            <span>الفترة: {fromDate} - {toDate}</span>
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl" }}>
            <thead>
              <tr style={{ background: "#1a365d" }}>
                {reportType === "attendance" && ["الموظف", "القسم", "التاريخ", "وقت الحضور", "وقت الانصراف", "الحالة"].map(h => (
                  <th key={h} style={{ padding: "12px", color: "white", border: "1px solid #333", fontSize: "13px", textAlign: "center" }}>{h}</th>
                ))}
                {reportType === "employees" && ["الاسم", "القسم", "الوردية", "تاريخ التعيين", "الراتب", "الحالة"].map(h => (
                  <th key={h} style={{ padding: "12px", color: "white", border: "1px solid #333", fontSize: "13px", textAlign: "center" }}>{h}</th>
                ))}
                {reportType === "evaluations" && ["الموظف", "القسم", "التقييم العام", "الحضور", "المهام"].map(h => (
                  <th key={h} style={{ padding: "12px", color: "white", border: "1px solid #333", fontSize: "13px", textAlign: "center" }}>{h}</th>
                ))}
                {reportType === "tasks" && ["العنوان", "المكلف", "الأولوية", "الحالة", "تاريخ الإنشاء"].map(h => (
                  <th key={h} style={{ padding: "12px", color: "white", border: "1px solid #333", fontSize: "13px", textAlign: "center" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(reportData || []).map((row: any, idx: number) => (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? "#f9f9f9" : "white" }}>
                  {reportType === "attendance" && (
                    <>
                      <td style={{ padding: "10px", border: "1px solid #ddd", fontWeight: "bold", textAlign: "center" }}>{row.employee?.name || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.employee?.department?.name || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.date || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.checkIn || "---"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.checkOut || "---"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.status === "present" ? "حاضر" : row.status === "late" ? "متأخر" : row.status === "absent" ? "غائب" : row.status}</td>
                    </>
                  )}
                  {reportType === "employees" && (
                    <>
                      <td style={{ padding: "10px", border: "1px solid #ddd", fontWeight: "bold", textAlign: "center" }}>{row.name || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.department?.name || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.shift?.name || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.hireDate ? new Date(row.hireDate).toLocaleDateString("ar-EG") : "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{(row.basicSalary || 0).toLocaleString("ar-EG")} ج.م</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.status === "active" ? "نشط" : row.status === "leave" ? "إجازة" : "موقوف"}</td>
                    </>
                  )}
                  {reportType === "evaluations" && (
                    <>
                      <td style={{ padding: "10px", border: "1px solid #ddd", fontWeight: "bold", textAlign: "center" }}>{row.employee?.name || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.employee?.department?.name || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.totalScore || 0}%</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.attendanceScore || 0}%</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.tasksScore || 0}%</td>
                    </>
                  )}
                  {reportType === "tasks" && (
                    <>
                      <td style={{ padding: "10px", border: "1px solid #ddd", fontWeight: "bold", textAlign: "center" }}>{row.title || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.assignee?.name || "-"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.priority === "high" ? "عالية" : row.priority === "medium" ? "متوسطة" : "منخفضة"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.status === "completed" ? "مكتملة" : row.status === "in_progress" ? "قيد التنفيذ" : row.status === "new" ? "جديدة" : "متأخرة"}</td>
                      <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>{row.createdAt ? new Date(row.createdAt).toLocaleDateString("ar-EG") : "-"}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: "30px", textAlign: "center", fontSize: "12px", color: "#999", borderTop: "1px solid #ddd", paddingTop: "20px" }}>
            تم إنشاء هذا التقرير بواسطة نظام إدارة الموارد البشرية | {new Date().toLocaleString("ar-EG")}
          </div>
        </div>
      </div>
    </div>
  );
}
