"use client";
import { useEffect, useState } from "react";
import { Plus, Filter, Clock, CheckCircle, AlertCircle, Calendar, Trash2, Edit2, Play, CheckCircle2, ChevronDown, User, Activity, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
  });

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, [statusFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks${statusFilter ? `?status=${statusFilter}` : ''}`);
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch (e) {}
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: "" });
        fetchTasks();
      } else {
        alert("فشل إنشاء المهمة. يرجى التحقق من البيانات المطلوبة.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه المهمة؟")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'var(--danger)';
      case 'medium': return 'var(--warning)';
      case 'low': return 'var(--success)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="badge badge-muted" style={{ display: 'flex', gap: '4px', alignItems: 'center'}}><AlertCircle size={12}/> جديدة</span>;
      case 'in_progress': return <span className="badge badge-info" style={{ display: 'flex', gap: '4px', alignItems: 'center'}}><Clock size={12}/> قيد التنفيذ</span>;
      case 'completed': return <span className="badge badge-success" style={{ display: 'flex', gap: '4px', alignItems: 'center'}}><CheckCircle2 size={12}/> مكتملة</span>;
      case 'overdue': return <span className="badge badge-danger" style={{ display: 'flex', gap: '4px', alignItems: 'center'}}><AlertCircle size={12}/> متأخرة</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  // Analytics Calculations
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    new: tasks.filter(t => t.status === 'new').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const chartData = [
    { name: 'مكتملة', value: stats.completed, color: '#10b981' },
    { name: 'قيد التنفيذ', value: stats.inProgress, color: '#3b82f6' },
    { name: 'جديدة', value: stats.new, color: '#94a3b8' },
    { name: 'متأخرة', value: stats.overdue, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity style={{ color: 'var(--gold-primary)' }} /> لوحة قيادة المهام
          </h1>
          <p className="page-subtitle">تحليلات وإدارة شاملة لجميع مهام الموظفين</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)' }}>
          <Plus size={18} /> تكليف بمهمة جديدة
        </button>
      </div>

      {/* Analytics Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="card glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>إجمالي المهام</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.total}</div>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} style={{ color: 'var(--gold-primary)' }} />
          </div>
        </div>
        
        <div className="card glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>نسبة الإنجاز</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)' }}>{completionRate}%</div>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} style={{ color: 'var(--success)' }} />
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>قيد التنفيذ</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--info)' }}>{stats.inProgress}</div>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} style={{ color: 'var(--info)' }} />
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>مهام متأخرة</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--danger)' }}>{stats.overdue}</div>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} style={{ color: 'var(--danger)' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
        
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tabs Filter */}
          <div className="tabs" style={{ margin: 0, padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <button className={`tab ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>الكل</button>
            <button className={`tab ${statusFilter === 'new' ? 'active' : ''}`} onClick={() => setStatusFilter('new')}>الجديدة</button>
            <button className={`tab ${statusFilter === 'in_progress' ? 'active' : ''}`} onClick={() => setStatusFilter('in_progress')}>قيد التنفيذ</button>
            <button className={`tab ${statusFilter === 'completed' ? 'active' : ''}`} onClick={() => setStatusFilter('completed')}>مكتملة</button>
          </div>

          {/* Tasks Grid */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {loading ? (
              <div style={{ gridColumn: '1 / -1', minHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="spinner"></div>
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                <AlertCircle size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>لا توجد مهام حالياً</h3>
                <p style={{ color: 'var(--text-secondary)' }}>لم يتم العثور على أي مهام تطابق معايير البحث المحددة.</p>
              </div>
            ) : tasks.map((task) => (
              <div className="card glass-panel" key={task.id} style={{ display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--text-primary)' }}>
                      {task.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', border: `1px solid ${getPriorityColor(task.priority)}` }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: getPriorityColor(task.priority) }}></span>
                        أولوية {task.priority === 'high' ? 'عالية' : task.priority === 'low' ? 'منخفضة' : 'متوسطة'}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(task.status)}
                </div>
                
                <div style={{ padding: '20px', flex: 1 }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6, minHeight: '44px' }}>
                    {task.description || 'لا يوجد وصف متاح'}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="employee-avatar avatar-sm" style={{ border: '1px solid var(--gold-primary)' }}>
                        {task.assignee?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>المكلف بالتنفيذ</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{task.assignee?.name || 'غير محدد'}</div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>تاريخ النشر</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {new Date(task.createdAt).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {task.status !== 'completed' && task.status !== 'in_progress' && (
                      <button onClick={() => handleUpdateStatus(task.id, 'in_progress')} className="btn btn-info btn-sm" title="بدء التنفيذ">
                        <Play size={14} />
                      </button>
                    )}
                    {task.status !== 'completed' && (
                      <button onClick={() => handleUpdateStatus(task.id, 'completed')} className="btn btn-success btn-sm" title="إكمال المهمة">
                        <CheckCircle size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setSelectedTask(task)} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-secondary)' }}>التفاصيل</button>
                    <button onClick={() => handleDeleteTask(task.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: '6px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel for Analytics */}
        <div className="card glass-panel" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChartIcon size={18} style={{ color: 'var(--gold-primary)' }} /> توزيع المهام
          </h3>
          
          {stats.total > 0 ? (
            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              لا توجد بيانات مخططات لعرضها
            </div>
          )}

          <div style={{ marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>نظرة سريعة</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>نسبة الإنجاز:</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--success)' }}>{completionRate}%</span>
              </div>
              <div style={{ width: '100%', backgroundColor: 'var(--bg-tertiary)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${completionRate}%`, backgroundColor: 'var(--success)', height: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Write/Add Task Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h2>تكليف بمهمة جديدة</h2>
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateTask}>
                <div className="form-group">
                  <label className="form-label">عنوان المهمة</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="مثال: إعداد التقرير الشهري"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">الموظف المكلف</label>
                  <select 
                    className="form-control" 
                    required 
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                  >
                    <option value="">-- اختر الموظف --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department?.name || 'بدون قسم'})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">الأولوية</label>
                    <select 
                      className="form-control"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    >
                      <option value="low">منخفضة</option>
                      <option value="medium">متوسطة</option>
                      <option value="high">عالية</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">تاريخ التسليم (اختياري)</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">تفاصيل وتوجيهات المهمة</label>
                  <textarea 
                    className="form-control" 
                    rows={4} 
                    placeholder="أضف وصفاً تفصيلياً أو متطلبات العمل هنا..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>

                <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'جاري الحفظ...' : 'حفظ وتكليف'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: getPriorityColor(selectedTask.priority) }}></span>
                {selectedTask.title}
              </h2>
              <button className="btn btn-ghost" onClick={() => setSelectedTask(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>المكلف بالتنفيذ</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedTask.assignee?.name || 'غير محدد'}</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>الحالة</div>
                  <div style={{ marginTop: '4px' }}>{getStatusBadge(selectedTask.status)}</div>
                </div>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>الوصف وتوجيهات المهمة:</h4>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {selectedTask.description || 'لا يوجد وصف متاح'}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div>تم الإنشاء بواسطة: {selectedTask.assigner?.name}</div>
                <div>موعد التسليم: {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString('ar-EG') : 'غير محدد'}</div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', display: 'flex', justifyContent: 'flex-end', padding: '0 24px 24px' }}>
              <button type="button" className="btn btn-primary" onClick={() => setSelectedTask(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
