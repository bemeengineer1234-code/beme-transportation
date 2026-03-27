export type UserRole = 'intern' | 'admin' | 'インターン' | '管理者';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
}

export type ApplicationStatus = 'pending' | 'approved' | 'returned';

export interface ExpenseApplication {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  location: string;
  departureStation: string;
  arrivalStation: string;
  route: string;
  amount: number;
  remarks: string;
  imageUrls: string[];
  status: ApplicationStatus;
  returnReason?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}
