import { AcademyRole } from '../generated/client';

export interface AuthenticatedUser {
  firebaseId: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
  globalRole?: string;
  status: string;
  activeRole?: string;
}

export interface AcademyUserProfile {
  id: number;
  userId: string;
  role: AcademyRole;
  hasSelectedRole: boolean;
  bio?: string | null;
  expertise?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  firstname: string;
  lastname: string;
  globalRole?: string;
  status: string;
}
