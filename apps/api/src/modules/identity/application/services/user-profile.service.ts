import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { UserRole } from '@loop/shared';
import { S3Service } from '../../../../infrastructure/storage/s3.service';
import { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { UpdateUserDto } from '../dto/update-user.dto';
import { GetUserByIdQuery, GetUsersQuery } from '../queries/get-user.handler';
import { UserEntity } from '../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../ports/user.repository.port';
import { normalizeName } from '../../../../common/utils/normalize-name';

/**
 * Strips sensitive fields from a user record before returning to the client.
 */
function sanitiseUser(user: Record<string, unknown>): Record<string, unknown> {
  const {
    passwordHash: _pw,
    metadata: _meta,
    socialSecurityNumber: _ssn,
    firebaseUid: _fb,
    ...safe
  } = user;
  return safe;
}

@Injectable()
export class UserProfileService {
  constructor(
    private readonly queryBus: QueryBus,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    private readonly s3: S3Service,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  GET /users/me                                                      */
  /* ------------------------------------------------------------------ */
  async getProfile(userId: string) {
    const fullUser = await this.queryBus.execute(new GetUserByIdQuery(userId));
    const safe = sanitiseUser(fullUser as Record<string, unknown>);
    const meta = ((fullUser as Record<string, unknown>).metadata as Record<string, unknown>) ?? {};
    return { ...safe, darkMode: meta.darkMode ?? false, compactView: meta.compactView ?? false, emailNotifications: meta.emailNotifications ?? true, pushNotifications: meta.pushNotifications ?? false };
  }

  /* ------------------------------------------------------------------ */
  /*  PUT /users/me                                                      */
  /* ------------------------------------------------------------------ */
  async updateProfile(user: AuthenticatedUser, dto: UpdateUserDto) {
    let metadataUpdate: Record<string, unknown> | undefined;

    const hasMetaFields = dto.darkMode !== undefined || dto.compactView !== undefined || dto.emailNotifications !== undefined || dto.pushNotifications !== undefined;
    if (hasMetaFields) {
      const current = await this.userRepo.findSelectById(user.id, { metadata: true });
      const meta = ((current?.metadata ?? {}) as Record<string, unknown>);
      if (dto.darkMode !== undefined) meta.darkMode = dto.darkMode;
      if (dto.compactView !== undefined) meta.compactView = dto.compactView;
      if (dto.emailNotifications !== undefined) meta.emailNotifications = dto.emailNotifications;
      if (dto.pushNotifications !== undefined) meta.pushNotifications = dto.pushNotifications;
      metadataUpdate = meta;
    }

    const updated = await this.userRepo.updateRaw(user.id, {
      ...(dto.firstName !== undefined && { firstName: normalizeName(dto.firstName) }),
      ...(dto.lastName !== undefined && { lastName: normalizeName(dto.lastName) }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.profileImage !== undefined && { profileImage: dto.profileImage }),
      ...(dto.nickname !== undefined && { nickname: dto.nickname }),
      ...(dto.closedDealEmoji !== undefined && { closedDealEmoji: dto.closedDealEmoji }),
      ...(dto.language !== undefined && { language: dto.language }),
      ...(metadataUpdate !== undefined && { metadata: metadataUpdate as any }),
    });

    return sanitiseUser(updated as unknown as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  POST /users/me/avatar                                              */
  /* ------------------------------------------------------------------ */
  async uploadAvatar(file: { originalname: string; buffer: Buffer; mimetype: string } | undefined, userId: string) {
    if (!file) {
      return { error: 'No file provided' };
    }

    const ext = file.originalname.split('.').pop();
    const key = `avatars/${userId}-${Date.now()}.${ext}`;

    if (this.s3.isConfigured()) {
      await this.s3.upload({
        key,
        body: file.buffer,
        contentType: file.mimetype,
      });
    }

    const avatarPath = `/api/v1/users/avatar/${userId}`;
    await this.userRepo.updateRaw(userId, {
      profileImage: avatarPath,
      metadata: { avatarS3Key: key },
    });

    return { url: avatarPath };
  }

  /* ------------------------------------------------------------------ */
  /*  GET /users/avatar/:id                                              */
  /* ------------------------------------------------------------------ */
  async getAvatar(id: string): Promise<
    | { found: false; status: number; error: string }
    | { found: true; buffer: Buffer; contentType: string }
  > {
    const user = await this.userRepo.findRawById(id);
    if (!user) {
      return { found: false, status: 404, error: 'User not found' };
    }

    const meta = ((user as unknown as Record<string, unknown>).metadata as Record<string, unknown>) ?? {};
    const s3Key = meta.avatarS3Key;

    if (!s3Key || !this.s3.isConfigured()) {
      return { found: false, status: 404, error: 'No avatar' };
    }

    try {
      const { body, contentType } = await this.s3.getObject(s3Key as string);
      const chunks: Buffer[] = [];
      for await (const chunk of body!) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const buffer = Buffer.concat(chunks);
      return { found: true, buffer, contentType };
    } catch {
      return { found: false, status: 404, error: 'Avatar not found in storage' };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  POST /users/me/accept-terms                                        */
  /* ------------------------------------------------------------------ */
  async acceptTerms(userId: string) {
    const updated = await this.userRepo.updateRaw(userId, {
      termsAcceptedAt: new Date(),
    });
    return sanitiseUser(updated as unknown as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  GET /users                                                         */
  /* ------------------------------------------------------------------ */
  async listUsers(skip: number, limit: number, search?: string): Promise<{ data: UserEntity[]; total: number }> {
    return this.queryBus.execute(new GetUsersQuery(skip, limit, search));
  }

  /* ------------------------------------------------------------------ */
  /*  GET /users/:id                                                     */
  /* ------------------------------------------------------------------ */
  async getUserById(id: string): Promise<UserEntity> {
    return this.queryBus.execute(new GetUserByIdQuery(id));
  }

  /* ------------------------------------------------------------------ */
  /*  PUT /users/:id  (admin)                                            */
  /* ------------------------------------------------------------------ */
  async updateUserById(id: string, dto: UpdateUserDto & { isActive?: boolean }) {
    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.nickname !== undefined) data.nickname = dto.nickname;
    if (dto.language !== undefined) data.language = dto.language;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.userRepo.updateRaw(id, data);
    return sanitiseUser(updated as unknown as Record<string, unknown>);
  }

  /* ------------------------------------------------------------------ */
  /*  PATCH /users/:id/role  (admin)                                     */
  /* ------------------------------------------------------------------ */
  async updateUserRole(id: string, role: UserRole): Promise<UserEntity> {
    await this.userRepo.updateRaw(id, { role });
    return this.queryBus.execute(new GetUserByIdQuery(id));
  }

  /* ------------------------------------------------------------------ */
  /*  PATCH /users/:id/approve  (admin)                                  */
  /* ------------------------------------------------------------------ */
  async approveUser(id: string, role: UserRole): Promise<UserEntity> {
    const user = await this.userRepo.findRawById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    if (user.isActive) {
      throw new BadRequestException('User is already active');
    }
    await this.userRepo.updateRaw(id, { isActive: true, role });
    return this.queryBus.execute(new GetUserByIdQuery(id));
  }

  /* ------------------------------------------------------------------ */
  /*  DELETE /users/:id/reject  (admin)                                  */
  /* ------------------------------------------------------------------ */
  async rejectUser(id: string): Promise<void> {
    const user = await this.userRepo.findRawById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    if (user.isActive) {
      throw new BadRequestException('Cannot reject an active user');
    }
    await this.userRepo.deleteById(id);
  }

  /* ------------------------------------------------------------------ */
  /*  PATCH /users/:id/toggle-active  (admin)                            */
  /* ------------------------------------------------------------------ */
  async toggleActive(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findRawById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const updated = await this.userRepo.updateRaw(id, { isActive: !user.isActive });
    return sanitiseUser(updated as unknown as Record<string, unknown>) as unknown as UserEntity;
  }
}
