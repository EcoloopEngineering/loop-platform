import { UserRole } from '@loop/shared';
import { UserEntity } from '../../domain/entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRawRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  passwordHash: string | null;
  metadata: unknown;
  firebaseUid: string | null;
  socialSecurityNumber: string | null;
  profileImage: string | null;
  invitationCode: string | null;
  nickname: string | null;
  closedDealEmoji: string | null;
  language: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepositoryPort {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByFirebaseUid(firebaseUid: string): Promise<UserEntity | null>;
  create(user: Partial<UserEntity>): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
  findAll(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ data: UserEntity[]; total: number }>;

  /** Returns the raw DB record (with passwordHash, metadata, etc.) */
  findRawById(id: string): Promise<UserRawRecord | null>;

  /** Returns the raw DB record by email */
  findRawByEmail(email: string): Promise<UserRawRecord | null>;

  /** Find a user by their invitation code */
  findByInvitationCode(code: string): Promise<UserRawRecord | null>;

  /** Create a user with full field control (including passwordHash, firebaseUid) */
  createRaw(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: UserRole;
    isActive: boolean;
    firebaseUid: string;
  }): Promise<UserRawRecord>;

  /** Update arbitrary fields on a user record (metadata, passwordHash, lastLoginAt, etc.) */
  updateRaw(id: string, data: Record<string, unknown>): Promise<UserRawRecord>;

  /** Find the first active user matching a metadata JSON path filter */
  findFirstByMetadataPath(path: string[], value: unknown): Promise<UserRawRecord | null>;

  /** Select specific fields from a user */
  findSelectById(id: string, select: Record<string, boolean>): Promise<Record<string, unknown> | null>;

  /** Delete a user by ID */
  deleteById(id: string): Promise<void>;
}
