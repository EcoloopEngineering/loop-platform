import { UserRole } from '@loop/shared';

/** Shape of the user object attached to request by FirebaseAuthGuard / JwtAuthGuard. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  profileImage: string | null;
}
