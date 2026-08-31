"use client";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { ShieldAlert, Radio, Mic, MicOff, Volume2, Laptop, Smartphone, Globe, Clock, MapPin, Play, Pause, RefreshCw, Send, CheckCircle2, AlertTriangle } from "lucide-react";

// Dynamic import for Leaflet map to avoid SSR issues
const SuperAdminMap = dynamic(() => import("./SuperAdminMap"), { ssr: false });

export default function SuperAdminPage() {
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("hr_user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
      } catch {}
    }
    fetchSessions();
    fetchVoiceMessages();

    // Periodic refresh
    const interval = setInterval(() => {
      fetchSessions();
      fetchVoiceMessages();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/superadmin/devices");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoiceMessages = async () => {
    try {
      const res = await fetch("/api/superadmin/voice");
      if (res.ok) {
        const data = await res.json();
        setVoiceMessages(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await sendVoiceMessage(base64Audio, recordingTime);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert("يرجى إعطاء صلاحية الميكروفون في المتصفح لبدء التسجيل الصوتي المباشر");
    }
  };

  // Stop Voice Recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const sendVoiceMessage = async (base64Audio: string, durationSec: number) => {
    setSendingAudio(true);
    try {
      const res = await fetch("/api/superadmin/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioData: base64Audio,
          duration: durationSec
        })
      });
      if (res.ok) {
        fetchVoiceMessages();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingAudio(false);
    }
  };

  const playVoice = (id: number, audioSrc: string) => {
    if (playingId === id) {
      audioPlayerRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioSrc;
        audioPlayerRef.current.play();
        setPlayingId(id);
        audioPlayerRef.current.onended = () => setPlayingId(null);
      }
    }
  };

  if (user && user.role !== "superadmin" && user.role !== "admin") {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <ShieldAlert size={48} color="var(--danger)" style={{ margin: "0 auto 16px" }} />
        <h2 style={{ color: "var(--danger)" }}>غير مصرح بالدخول</h2>
        <p style={{ color: "var(--text-muted)" }}>هذه الصفحة مخصصة فقط للمشرف العام على النظام (Super Admin Arco).</p>
      </div>
    );
  }

  const onlineSessions = sessions.filter(s => (Date.now() - new Date(s.lastSeen).getTime()) < 5 * 60 * 1000);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <audio ref={audioPlayerRef} style={{ display: "none" }} />

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--gold-primary)" }}>
            <Radio size={26} color="var(--gold-primary)" /> لوحة الإشراف المتقدم وتتبع أجهزة الإدارة
          </h1>
          <p className="page-subtitle">مراقبة الأجهزة المسجلة لحساب الأدمن، تتبع أماكنها الحية، وبث الصوت المباشر (Voice Dispatch)</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="badge badge-gold" style={{ padding: "8px 14px", fontSize: "13px" }}>
            المشرف الحالي: {user?.name || "Arco"}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchSessions(); fetchVoiceMessages(); }}>
            <RefreshCw size={14} /> تحديث البيانات
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stat-grid">
        <div className="card stat-card" style={{ padding: "20px", border: "1px solid rgba(212,175,55,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>الأجهزة النشطة حالياً (Online)</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--success)" }}>{onlineSessions.length}</div>
            </div>
            <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)", color: "var(--success)" }}>
              <Laptop size={24} />
            </div>
          </div>
        </div>

        <div className="card stat-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>إجمالي الجلسات المسجلة (24 ساعة)</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--gold-primary)" }}>{sessions.length}</div>
            </div>
            <div className="stat-icon" style={{ background: "rgba(212,175,55,0.1)", color: "var(--gold-primary)" }}>
              <Globe size={24} />
            </div>
          </div>
        </div>

        <div className="card stat-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>التسجيلات والرسائل الصوتية</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--info)" }}>{voiceMessages.length}</div>
            </div>
            <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)", color: "var(--info)" }}>
              <Volume2 size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Voice Dispatch Center */}
      <div className="card" style={{ padding: "24px", background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(0,0,0,0.6))", border: "1px solid rgba(212,175,55,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--gold-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <Radio size={20} /> وحدة البث الصوتي المباشر والاتصال الإداري
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
              يمكنك تسجيل وإرسال تسجيلات صوتية فورية ليتم تشغيلها والاستماع إليها عبر أجهزة الإدارة المصرح لها.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isRecording ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="badge badge-danger" style={{ animation: "pulse 1s infinite", padding: "8px 14px", fontSize: "13px" }}>
                  🔴 جاري التسجيل المباشر: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </span>
                <button 
                  className="btn btn-danger"
                  onClick={stopRecording}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <MicOff size={16} /> إنهاء وبث التسجيل
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={startRecording}
                disabled={sendingAudio}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, var(--gold-dark), var(--gold-primary))", color: "#000", fontWeight: 700 }}
              >
                <Mic size={16} /> {sendingAudio ? "جاري البث..." : "بدء تسجيل صوتي مباشر"}
              </button>
            )}
          </div>
        </div>

        {/* Voice Messages List */}
        <div style={{ marginTop: "20px" }}>
          <h4 style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>سجل البث الصوتي الأخير:</h4>
          {voiceMessages.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              لا توجد تسجيلات صوتية مسجلة حتى الآن.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
              {voiceMessages.map((vm: any) => (
                <div 
                  key={vm.id}
                  className="card"
                  style={{ 
                    padding: "14px 16px", 
                    background: "rgba(255,255,255,0.03)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    gap: 12
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => playVoice(vm.id, vm.audioData)}
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: playingId === vm.id ? "var(--danger)" : "var(--gold-primary)",
                        border: "none", color: "#000", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      {playingId === vm.id ? <Pause size={16} color="#fff" /> : <Play size={16} color="#000" />}
                    </button>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{vm.senderName}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(vm.createdAt).toLocaleTimeString("ar-EG")} ({vm.duration} ثانية)</div>
                    </div>
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: "10px" }}>بث صوتي</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin Devices Private Map */}
      <div className="card" style={{ padding: "20px" }}>
        <h3 style={{ marginBottom: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
          <MapPin size={20} color="var(--gold-primary)" /> خريطة مواقع أجهزة الإدارة المتصلة
        </h3>
        <SuperAdminMap sessions={sessions} />
      </div>

      {/* Devices Sessions Table */}
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <Laptop size={20} color="var(--gold-primary)" /> سجل الأجهزة والجلسات المسجلة لحساب الأدمن
          </h3>
          <span className="badge badge-gold">{sessions.length} جلسة مسجلة</span>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={40} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
            <p>لا توجد جلسات مسجلة بعد.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  <th>المستخدم</th>
                  <th>الجهاز / النظام</th>
                  <th>عنوان IP</th>
                  <th>المتصفح (User Agent)</th>
                  <th>آخر ظهور</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s: any, idx: number) => {
                  const isOnline = (Date.now() - new Date(s.lastSeen).getTime()) < 5 * 60 * 1000;
                  return (
                    <tr key={s.id}>
                      <td style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
                      <td style={{ fontWeight: 700, color: "var(--gold-primary)" }}>{s.username}</td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {s.deviceName?.includes("iPhone") || s.deviceName?.includes("Android") ? <Smartphone size={15} /> : <Laptop size={15} />}
                          {s.deviceName || "جهاز غير محدد"}
                        </span>
                      </td>
                      <td style={{ direction: "ltr", textAlign: "right", fontFamily: "monospace", fontSize: "12px" }}>
                        {s.ipAddress || "127.0.0.1"}
                      </td>
                      <td style={{ fontSize: "11px", color: "var(--text-muted)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.userAgent}>
                        {s.userAgent?.substring(0, 45)}...
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                        {new Date(s.lastSeen).toLocaleString("ar-EG")}
                      </td>
                      <td>
                        <span className={`badge ${isOnline ? "badge-success" : "badge-muted"}`}>
                          {isOnline ? "🟢 متصل الآن" : "⚪ غير نشط"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
