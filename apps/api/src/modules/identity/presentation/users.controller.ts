import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser() user: UserEntity): Promise<UserEntity> {
    return this.queryBus.execute(new GetUserByIdQuery(user.id));
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current authenticated user profile' })
  async updateMe(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateUserDto,
  ): Promise<UserEntity> {
    const currentUser = new UserEntity(user);
    currentUser.updateProfile(dto);

    // Re-fetch via query to return updated data
    return this.queryBus.execute(new GetUserByIdQuery(user.id));
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
