import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { UserRepositoryPort } from '../../application/ports/user.repository.port';
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
        // Preserve relations for API response
        const extended = entity as UserEntity & { referralsReceived?: unknown; _count?: unknown };
        extended.referralsReceived = (u as User & { referralsReceived?: unknown }).referralsReceived;
        extended._count = (u as User & { _count?: unknown })._count;
        return entity;
      }),
      total,
    };
  }
}
