import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  PaginationDto,
  PaginatedResponse,
} from '../../../common/dto/pagination.dto';
import { UserRole } from '@loop/shared';
import { UpdateUserDto } from '../application/dto/update-user.dto';
import {
  GetUserByIdQuery,
  GetUsersQuery,
} from '../application/queries/get-user.handler';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { S3Service } from '../../../infrastructure/storage/s3.service';
import { UserEntity } from '../domain/entities/user.entity';

class ChangeRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser() user: any): Promise<any> {
    const fullUser = await this.queryBus.execute(new GetUserByIdQuery(user.id));
    // Never expose sensitive fields
    const { passwordHash, metadata, socialSecurityNumber, firebaseUid, ...safe } = fullUser as any;
    const meta = (metadata as Record<string, any>) ?? {};
    return { ...safe, darkMode: meta.darkMode ?? false, compactView: meta.compactView ?? false };
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  async updateMe(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateUserDto,
  ) {
    // Handle metadata prefs (darkMode, compactView)
    const body = dto as any;
    let metadataUpdate = undefined;
    if (body.darkMode !== undefined || body.compactView !== undefined) {
      const current = await this.prisma.user.findUnique({ where: { id: user.id }, select: { metadata: true } });
      const meta = ((current?.metadata as any) ?? {});
      if (body.darkMode !== undefined) meta.darkMode = body.darkMode;
      if (body.compactView !== undefined) meta.compactView = body.compactView;
      metadataUpdate = meta;
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.profileImage !== undefined && { profileImage: dto.profileImage }),
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.closedDealEmoji !== undefined && { closedDealEmoji: dto.closedDealEmoji }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(metadataUpdate !== undefined && { metadata: metadataUpdate }),
      },
    });
    const { passwordHash, metadata, socialSecurityNumber, firebaseUid, ...safe } = updated as any;
    return safe;
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload avatar image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @UploadedFile() file: any,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      return { error: 'No file provided' };
    }

    const key = `avatars/${userId}-${Date.now()}.${file.originalname.split('.').pop()}`;

    if (this.s3.isConfigured()) {
      await this.s3.upload({
        key,
        body: file.buffer,
        contentType: file.mimetype,
      });
    }

    // Save the S3 key as profileImage (served via /users/me/avatar GET)
    const avatarPath = `/api/v1/users/avatar/${userId}`;
    await this.prisma.user.update({
      where: { id: userId },
      data: { profileImage: avatarPath, metadata: { avatarS3Key: key } },
    });

    return { url: avatarPath };
  }

  @Get('avatar/:id')
  @ApiOperation({ summary: 'Get user avatar image (streams from S3)' })
  async getAvatar(
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const meta = (user.metadata as any) ?? {};
    const s3Key = meta.avatarS3Key;

    if (s3Key && this.s3.isConfigured()) {
      try {
        const { body, contentType } = await this.s3.getObject(s3Key);
        const chunks: Buffer[] = [];
        for await (const chunk of body) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const buffer = Buffer.concat(chunks);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.end(buffer);
        return;
      } catch {
        return res.status(404).json({ error: 'Avatar not found in storage' });
      }
    }

    return res.status(404).json({ error: 'No avatar' });
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all users (admin/manager only)' })
  async findAll(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponse<UserEntity>> {
    const result = await this.queryBus.execute(
      new GetUsersQuery(pagination.skip, pagination.limit, pagination.search),
    );
    return new PaginatedResponse(
      result.data,
      result.total,
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get user by ID (admin/manager only)' })
  async findOne(@Param('id') id: string): Promise<UserEntity> {
    return this.queryBus.execute(new GetUserByIdQuery(id));
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user by ID (admin only)' })
  async updateUserById(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto & { isActive?: boolean },
  ) {
    const data: Record<string, any> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.nickname !== undefined) data.nickname = dto.nickname;
    if (dto.language !== undefined) data.language = dto.language;
    if ((dto as any).isActive !== undefined) data.isActive = (dto as any).isActive;

    const updated = await this.prisma.user.update({ where: { id }, data });
    const { passwordHash, metadata, socialSecurityNumber, firebaseUid, ...safe } = updated as any;
    return safe;
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Change user role (admin only)' })
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
  ): Promise<UserEntity> {
    await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
    });
    return this.queryBus.execute(new GetUserByIdQuery(id));
  }
}
