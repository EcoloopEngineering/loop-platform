import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { UserRole } from '@loop/shared';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  UserRepositoryPort,
  UserRawRecord,
} from '../../application/ports/user.repository.port';
import { UserEntity } from '../../domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? new UserEntity(user as Partial<UserEntity>) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? new UserEntity(user as Partial<UserEntity>) : null;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
    });
    return user ? new UserEntity(user as Partial<UserEntity>) : null;
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email!,
        firstName: data.firstName!,
        lastName: data.lastName!,
        firebaseUid: data.firebaseUid!,
        phone: data.phone ?? null,
        role: data.role!,
      },
    });
    return new UserEntity(user as Partial<UserEntity>);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.profileImage !== undefined && {
          profileImage: data.profileImage,
        }),
        ...(data.nickname !== undefined && { nickname: data.nickname }),
        ...(data.closedDealEmoji !== undefined && {
          closedDealEmoji: data.closedDealEmoji,
        }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return new UserEntity(user as Partial<UserEntity>);
  }

  async findAll(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ data: UserEntity[]; total: number }> {
    const where = params.search
      ? {
          OR: [
            { firstName: { contains: params.search, mode: 'insensitive' as const } },
            { lastName: { contains: params.search, mode: 'insensitive' as const } },
            { email: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: {
          referralsReceived: {
            take: 1,
            include: { inviter: { select: { firstName: true, lastName: true } } },
          },
          _count: { select: { leadAssignments: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => {
        const entity = new UserEntity(u as Partial<UserEntity>);
        const extended = entity as UserEntity & { referralsReceived?: unknown; _count?: unknown };
        extended.referralsReceived = (u as User & { referralsReceived?: unknown }).referralsReceived;
        extended._count = (u as User & { _count?: unknown })._count;
        return entity;
      }),
      total,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  New methods for auth / profile services                            */
  /* ------------------------------------------------------------------ */

  async findRawById(id: string): Promise<UserRawRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user as UserRawRecord | null;
  }

  async findRawByEmail(email: string): Promise<UserRawRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user as UserRawRecord | null;
  }

  async findByInvitationCode(code: string): Promise<UserRawRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { invitationCode: code } });
    return user as UserRawRecord | null;
  }

  async createRaw(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: UserRole;
    isActive: boolean;
    firebaseUid: string;
  }): Promise<UserRawRecord> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        isActive: data.isActive,
        firebaseUid: data.firebaseUid,
      },
    });
    return user as UserRawRecord;
  }

  async updateRaw(id: string, data: Record<string, unknown>): Promise<UserRawRecord> {
    const user = await this.prisma.user.update({
      where: { id },
      data: data as Prisma.UserUpdateInput,
    });
    return user as UserRawRecord;
  }

  async findFirstByMetadataPath(path: string[], value: unknown): Promise<UserRawRecord | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        metadata: { path, equals: value },
      } as any,
    });
    return user as UserRawRecord | null;
  }

  async findSelectById(id: string, select: Record<string, boolean>): Promise<Record<string, unknown> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select,
    });
    return user as Record<string, unknown> | null;
  }
}
