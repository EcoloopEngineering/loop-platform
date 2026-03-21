import { UserEntity } from '../../domain/entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

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
}
