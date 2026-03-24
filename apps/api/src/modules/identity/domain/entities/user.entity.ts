import { UserRole } from '@loop/shared';

export class UserEntity {
  id: string;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  profileImage: string | null;
  socialSecurityNumber: string | null;
  invitationCode: string;
  nickname: string | null;
  closedDealEmoji: string | null;
  language: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    profileImage?: string | null;
    nickname?: string | null;
    closedDealEmoji?: string | null;
    language?: string;
  }): void {
    if (data.firstName !== undefined) this.firstName = data.firstName;
    if (data.lastName !== undefined) this.lastName = data.lastName;
    if (data.phone !== undefined) this.phone = data.phone;
    if (data.profileImage !== undefined) this.profileImage = data.profileImage;
    if (data.nickname !== undefined) this.nickname = data.nickname;
    if (data.closedDealEmoji !== undefined)
      this.closedDealEmoji = data.closedDealEmoji;
    if (data.language !== undefined) this.language = data.language;
    this.updatedAt = new Date();
  }

  changeRole(role: UserRole): void {
    this.role = role;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }
}
