import { UserEntity } from './user.entity';

export class TeamEntity {
  id: string;
  name: string;
  image: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  members?: UserEntity[];

  constructor(partial: Partial<TeamEntity>) {
    Object.assign(this, partial);
  }

  updateInfo(data: { name?: string; image?: string | null }): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.image !== undefined) this.image = data.image;
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

  get memberCount(): number {
    return this.members?.length ?? 0;
  }
}
