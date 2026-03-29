import { UserRole } from '@loop/shared';

/** Shape of the user object attached to request by FirebaseAuthGuard / JwtAuthGuard. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  profileImage: string | null;
}
