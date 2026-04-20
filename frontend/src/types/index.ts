export interface User {
  id: number;
  email: string;
  name: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  createdAt?: string;
  photoUrl?: string;
}

export interface DoctorProfile {
  id: number;
  userId: number;
  specialty: string;
  specialties: string[];
  hospital?: string;
  location?: string;
  bio?: string;
  photoUrl?: string;
  avgRating: number;
  reviewCount: number;
  user?: User;
}

export interface TimeBlock {
  id: number;
  doctorId: number;
  startTime: string;
  endTime: string;
  date: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  doctorId: number;
  timeBlockId: number;
  date: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  reason?: string;
  notes?: string;
  timeBlock?: TimeBlock;
  patient: { id: number; name: string };
  doctor: { id: number; name: string };
}

export interface Review {
  id: number;
  doctorProfileId: number;
  patientId: number;
  appointmentId: number;
  rating: number;
  text: string;
  helpfulCount: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type AdminUser = User & {
  isActive: boolean;
  isSuspended: boolean;
  doctorProfile?: { specialty: string } | null;
};
