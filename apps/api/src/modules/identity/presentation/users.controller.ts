import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { UserProfileService } from '../application/services/user-profile.service';
import { UserEntity } from '../domain/entities/user.entity';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

class ChangeRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;
}

class ApproveUserDto {
  @ApiProperty({ enum: UserRole, description: 'Role to assign upon approval' })
  @IsEnum(UserRole)
  role!: UserRole;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.userProfileService.getProfile(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userProfileService.updateProfile(user, dto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload avatar image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar', {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req: any, file: { mimetype: string; originalname: string }, cb: (err: Error | null, accept: boolean) => void) => {
      const allowed = /\.(png|jpe?g|gif|webp)$/i;
      if (allowed.test(file.originalname)) return cb(null, true);
      cb(new BadRequestException('File type not allowed'), false);
    },
  }))
  async uploadAvatar(
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.userProfileService.uploadAvatar(file, userId);
  }

  @Get('avatar/:id')
  @ApiOperation({ summary: 'Get user avatar image (streams from S3)' })
  async getAvatar(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.userProfileService.getAvatar(id);

    if (!result.found) {
      return res.status(result.status).json({ error: result.error });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.end(result.buffer);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all users (admin/manager only)' })
  async findAll(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponse<UserEntity>> {
    const result = await this.userProfileService.listUsers(
      pagination.skip,
      pagination.limit,
      pagination.search,
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
    return this.userProfileService.getUserById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user by ID (admin only)' })
  async updateUserById(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto & { isActive?: boolean },
  ) {
    return this.userProfileService.updateUserById(id, dto);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Change user role (admin only)' })
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
  ): Promise<UserEntity> {
    return this.userProfileService.updateUserRole(id, dto.role);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a pending user and assign role (admin only)' })
  async approveUser(
    @Param('id') id: string,
    @Body() dto: ApproveUserDto,
  ): Promise<UserEntity> {
    return this.userProfileService.approveUser(id, dto.role);
  }

  @Delete(':id/reject')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject and delete a pending user (admin only)' })
  async rejectUser(@Param('id') id: string): Promise<void> {
    return this.userProfileService.rejectUser(id);
  }
}
