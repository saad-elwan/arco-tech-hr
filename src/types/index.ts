// Common TypeScript types for the HR System

export interface Employee {
  id: number;
  name: string;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  photo: string | null;
  password: string;
  basicSalary: number;
  role: string;
  hireDate: Date | string;
  status: string;
  fingerprintId: string | null;
  departmentId: number | null;
  shiftId: number | null;
  maxAdvanceLimit: number;
  permissions: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  department?: Department | null;
  shift?: Shift | null;
}

export interface Department {
  id: number;
  name: string;
  createdAt: Date | string;
}

export interface Shift {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  createdAt: Date | string;
}

export interface Attendance {
  id: number;
  employeeId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  source: string;
  notes: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  isOutOfRange: boolean;
  createdAt: Date | string;
  employee?: Employee;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  assignedTo: number;
  assignedBy: number;
  priority: string;
  status: string;
  dueDate: Date | string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  assignee?: Employee;
  assigner?: Employee;
  comments?: TaskComment[];
}

export interface TaskComment {
  id: number;
  taskId: number;
  employeeId: number;
  comment: string;
  createdAt: Date | string;
  task?: Task;
  employee?: Employee;
}

export interface Evaluation {
  id: number;
  employeeId: number;
  evaluatorId: number;
  period: string;
  attendanceScore: number;
  tasksScore: number;
  manualScore: number | null;
  totalScore: number;
  comments: string | null;
  type: string;
  createdAt: Date | string;
  employee?: Employee;
  evaluator?: Employee;
}

export interface Payroll {
  id: number;
  employeeId: number;
  period: string;
  basicSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  autoDeduction: number;
  bonus: number;
  manualDeduction: number;
  netSalary: number;
  status: string;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  employee?: Employee;
}

export interface LocationLog {
  id: number;
  employeeId: number;
  latitude: number;
  longitude: number;
  isOutOfRange: boolean;
  timestamp: Date | string;
  employee?: Employee;
}

export interface AdvanceRequest {
  id: number;
  employeeId: number;
  amount: number;
  reason: string;
  status: string;
  approvedAmount: number;
  repaidAmount: number;
  reviewedBy: number | null;
  reviewNote: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  employee?: Employee;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  type: string;
  date: string;
  duration: number;
  reason: string;
  status: string;
  reviewedBy: number | null;
  reviewNote: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  employee?: Employee;
}

export interface Notification {
  id: number;
  employeeId: number;
  type: string;
  category: string;
  title: string;
  body: string;
  isRead: boolean;
  link: string;
  createdAt: Date | string;
  employee?: Employee;
}

export interface Company {
  id: number;
  name: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  workStartTime: string;
  workEndTime: string;
  lateThresholdMin: number;
  geofenceLat: number | null;
  geofenceLng: number | null;
  geofenceRadius: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// API Response types
export interface DashboardData {
  role: string;
  stats: {
    totalEmployees: number;
    todayPresent: number;
    todayAbsent: number;
    todayLate: number;
  };
  chartData: { day: number; count: number }[];
  tasksByStatus: Record<string, number>;
  topEmployees: Evaluation[];
  recentActivity: Attendance[];
  error?: string;
}

export interface MeData {
  employee: Employee;
  todayAttendance: Attendance | null;
  stats: {
    presentDays: number;
    absentDays: number;
    totalLateMinutes: number;
  };
  payroll: Payroll | null;
  evaluation: Evaluation | null;
  advances: {
    maxLimit: number;
    totalOwed: number;
    available: number;
  };
  leaveRequests: LeaveRequest[];
  tasks: Task[];
}

export interface AuthUser {
  id: number;
  role: string;
  name: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Component prop types
export interface MapComponentProps {
  employees: (Employee & { lastLocation?: LocationLog & { timestamp: string }; attendance?: Attendance })[];
  geofence: { lat: number; lng: number; radius: number } | null;
}