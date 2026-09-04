"use client";
import { useEffect, useState } from "react";
import { Plus, Filter, Clock, CheckCircle, AlertCircle, Calendar, Trash2, Edit2, Play, CheckCircle2, ChevronDown, User, Activity, PieChart as PieChartIcon, GripVertical } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  
  // For avoiding hydration mismatch with react-beautiful-dnd
  const [isBrowser, setIsBrowser] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
  });

  useEffect(() => {
    setIsBrowser(true);
    fetchTasks();
    fetchEmployees();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks`);
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
      if (res.ok) {
        // Only fetch if necessary, but optimistic update handles the UI instantly
      }
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

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId;
    const taskId = parseInt(draggableId.replace("task-", ""));

    // Optimistic UI update
    const newTasks = [...tasks];
    const taskIndex = newTasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1) {
      newTasks[taskIndex].status = newStatus;
      setTasks(newTasks);
    }

    // API update
    handleUpdateStatus(taskId, newStatus);
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

  const columns = [
    { id: 'new', title: 'مهام جديدة', icon: AlertCircle, color: 'var(--text-muted)' },
    { id: 'in_progress', title: 'قيد التنفيذ', icon: Clock, color: 'var(--info)' },
    { id: 'overdue', title: 'متأخرة', icon: AlertCircle, color: 'var(--danger)' },
    { id: 'completed', title: 'مكتملة', icon: CheckCircle2, color: 'var(--success)' }
  ];

  if (!isBrowser) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity style={{ color: 'var(--gold-primary)' }} /> لوحة إدارة المهام (Kanban)
          </h1>
          <p className="page-subtitle">اسحب وأفلت المهام لتغيير حالتها ومتابعة الإنجاز</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)' }}>
          <Plus size={18} /> تكليف بمهمة جديدة
        </button>
      </div>

      {/* Analytics Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>إجمالي المهام</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.total}</div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} style={{ color: 'var(--gold-primary)' }} />
          </div>
        </div>
        
        <div className="card glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>نسبة الإنجاز</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>{completionRate}%</div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={20} style={{ color: 'var(--success)' }} />
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>قيد التنفيذ</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--info)' }}>{stats.inProgress}</div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} style={{ color: 'var(--info)' }} />
          </div>
        </div>

        <div className="card glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>مهام متأخرة</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger)' }}>{stats.overdue}</div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))', gap: '16px', overflowX: 'auto', paddingBottom: '16px', minHeight: '600px' }}>
          
          {columns.map((col) => (
            <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-lg)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 8px' }}>
                <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-primary)' }}>
                  <col.icon size={16} color={col.color} />
                  {col.title}
                </h3>
                <span style={{ fontSize: '12px', fontWeight: 'bold', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px' }}>
                  {tasks.filter(t => t.status === col.id).length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      flex: 1,
                      minHeight: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      background: snapshot.isDraggingOver ? 'var(--bg-tertiary)' : 'transparent',
                      borderRadius: 'var(--radius-md)',
                      transition: 'background 0.2s ease',
                      padding: '4px'
                    }}
                  >
                    {tasks.filter(t => t.status === col.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={`task-${task.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="card glass-panel"
                            style={{
                              ...provided.draggableProps.style,
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              background: snapshot.isDragging ? 'var(--bg-modal)' : 'var(--bg-card)',
                              boxShadow: snapshot.isDragging ? '0 8px 30px rgba(0,0,0,0.5)' : 'none',
                              transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} scale(1.02)` : provided.draggableProps.style?.transform,
                              cursor: 'grab'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                {task.title}
                              </h4>
                              <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', border: `1px solid ${getPriorityColor(task.priority)}` }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: getPriorityColor(task.priority) }}></span>
                                {task.priority === 'high' ? 'عالية' : task.priority === 'low' ? 'منخفضة' : 'متوسطة'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="employee-avatar avatar-sm" style={{ border: '1px solid var(--gold-primary)', width: 24, height: 24, fontSize: 10 }}>
                                  {task.assignee?.name?.charAt(0) || 'U'}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{task.assignee?.name || 'غير محدد'}</div>
                              </div>
                              <button onClick={() => setSelectedTask(task)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: '11px' }}>التفاصيل</button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

            </div>
          ))}

        </div>
      </DragDropContext>


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
