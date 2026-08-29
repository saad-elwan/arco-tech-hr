"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, DollarSign, FileText } from "lucide-react";

type Tab = "advances" | "leaves";

export default function RequestsPage() {
  const [tab, setTab] = useState<Tab>("advances");
  const [advances, setAdvances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadInitial() {
      setLoading(true);
      const [a, l] = await Promise.all([
        fetch("/api/advances").then(r => r.json()),
        fetch("/api/leaves").then(r => r.json()),
      ]);
      if (mounted) {
        setAdvances(a.advances || []);
        setLeaves(l.leaves || []);
        setLoading(false);
      }
    }
    loadInitial();
    return () => { mounted = false; };
  }, []);

  async function refreshData() {
    const [a, l] = await Promise.all([
      fetch("/api/advances").then(r => r.json()),
      fetch("/api/leaves").then(r => r.json()),
    ]);
    setAdvances(a.advances || []);
    setLeaves(l.leaves || []);
  }

  async function reviewAdvance(id: number, status: string) {
    const res = await fetch(`/api/advances/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, approvedAmount: approvedAmount || undefined, reviewNote })
    });
    if (res.ok) {
      setMsg(status === "approved" ? "✅ تمت الموافقة" : "❌ تم الرفض");
      setReviewingId(null); setReviewNote(""); setApprovedAmount("");
      refreshData();
    }
    setTimeout(() => setMsg(""), 3000);
  }

  async function reviewLeave(id: number, status: string) {
    const res = await fetch(`/api/leaves/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote })
    });
    if (res.ok) {
      setMsg(status === "approved" ? "✅ تمت الموافقة" : "❌ تم الرفض");
      setReviewingId(null); setReviewNote("");
      refreshData();
    }
    setTimeout(() => setMsg(""), 3000);
  }

  const pendingAdvances = advances.filter(a => a.status === "pending").length;
  const pendingLeaves = leaves.filter(l => l.status === "pending").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><span className="page-title-icon">📋</span> إدارة الطلبات</h1>
          <p className="page-subtitle">مراجعة طلبات السلف والإجازات</p>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8, background: "var(--success-bg)", border: "1px solid var(--success)", color: "var(--success)", fontSize: 14 }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${tab === "advances" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("advances")}
        >
          <DollarSign size={16} /> السلف
          {pendingAdvances > 0 && <span className="nav-badge">{pendingAdvances}</span>}
        </button>
        <button
          className={`btn ${tab === "leaves" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("leaves")}
        >
          <FileText size={16} /> طلبات الإذن
          {pendingLeaves > 0 && <span className="nav-badge">{pendingLeaves}</span>}
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : tab === "advances" ? (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>المبلغ المطلوب</th>
                  <th>السبب</th>
                  <th>الحالة</th>
                  <th>تاريخ الطلب</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {advances.map(adv => (
                  <tr key={adv.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{adv.employee?.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{adv.employee?.department?.name}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--gold-primary)" }}>{adv.amount.toLocaleString("ar-EG")} جنيه</td>
                    <td style={{ maxWidth: 200 }}><div style={{ whiteSpace: "normal", fontSize: 13 }}>{adv.reason}</div></td>
                    <td>
                      <span className={`badge ${adv.status === "approved" ? "badge-success" : adv.status === "rejected" ? "badge-danger" : "badge-warning"}`}>
                        {adv.status === "approved" ? "موافق" : adv.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                      </span>
                      {adv.status === "approved" && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                          معتمد: {adv.approvedAmount} جنيه
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>{new Date(adv.createdAt).toLocaleDateString("ar-EG")}</td>
                    <td>
                      {adv.status === "pending" && (
                        reviewingId === adv.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
                            <input
                              type="number"
                              className="form-control"
                              placeholder="المبلغ المعتمد"
                              value={approvedAmount}
                              onChange={e => setApprovedAmount(e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-control"
                              placeholder="ملاحظة (اختياري)"
                              value={reviewNote}
                              onChange={e => setReviewNote(e.target.value)}
                            />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-success btn-sm" onClick={() => reviewAdvance(adv.id, "approved")}>
                                <CheckCircle size={14} /> موافقة
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => reviewAdvance(adv.id, "rejected")}>
                                <XCircle size={14} /> رفض
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => { setReviewingId(adv.id); setApprovedAmount(String(adv.amount)); }}>
                            مراجعة
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
                {advances.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>لا توجد طلبات سلف</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>نوع الطلب</th>
                  <th>التاريخ</th>
                  <th>المدة</th>
                  <th>السبب</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(lv => (
                  <tr key={lv.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{lv.employee?.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{lv.employee?.department?.name}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {lv.type === "vacation" ? "إجازة" : lv.type === "early_leave" ? "انصراف مبكر" : "غياب بإذن"}
                      </span>
                    </td>
                    <td>{lv.date}</td>
                    <td>{lv.duration} {lv.type === "early_leave" ? "ساعة" : "يوم"}</td>
                    <td style={{ maxWidth: 150 }}><div style={{ whiteSpace: "normal", fontSize: 13 }}>{lv.reason}</div></td>
                    <td>
                      <span className={`badge ${lv.status === "approved" ? "badge-success" : lv.status === "rejected" ? "badge-danger" : "badge-warning"}`}>
                        {lv.status === "approved" ? "موافق" : lv.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                      </span>
                    </td>
                    <td>
                      {lv.status === "pending" && (
                        reviewingId === lv.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="ملاحظة"
                              value={reviewNote}
                              onChange={e => setReviewNote(e.target.value)}
                            />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-success btn-sm" onClick={() => reviewLeave(lv.id, "approved")}>
                                <CheckCircle size={14} /> موافقة
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => reviewLeave(lv.id, "rejected")}>
                                <XCircle size={14} /> رفض
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => setReviewingId(lv.id)}>
                            مراجعة
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>لا توجد طلبات إذن</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
