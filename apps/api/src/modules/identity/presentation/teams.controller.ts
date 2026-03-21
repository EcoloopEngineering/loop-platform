import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  PaginationDto,
  PaginatedResponse,
} from '../../../common/dto/pagination.dto';
import { UserRole } from '@loop/shared';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TeamEntity } from '../domain/entities/team.entity';
import { UserEntity } from '../domain/entities/user.entity';

class CreateTeamDto {
  @ApiProperty({ example: 'Alpha Team' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'https://example.com/team.png' })
  @IsOptional()
  @IsString()
  image?: string;
}

class UpdateTeamDto {
  @ApiPropertyOptional({ example: 'Beta Team' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/team.png' })
  @IsOptional()
  @IsString()
  image?: string;
}

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all teams' })
  async findAll(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponse<TeamEntity>> {
    const where = pagination.search
      ? { name: { contains: pagination.search, mode: 'insensitive' as const } }
      : {};

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: { members: true },
      }),
      this.prisma.team.count({ where }),
    ]);

    return new PaginatedResponse(
      teams.map((t) => new TeamEntity(t)),
      total,
      pagination.page,
      pagination.limit,
    );
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a team' })
  async create(@Body() dto: CreateTeamDto): Promise<TeamEntity> {
    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        image: dto.image ?? null,
      },
    });
    return new TeamEntity(team);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a team' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
  ): Promise<TeamEntity> {
    const team = await this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.image !== undefined && { image: dto.image }),
      },
    });
    return new TeamEntity(team);
  }

  @Get(':id/members')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get team members' })
  async getMembers(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponse<UserEntity>> {
    const where = { teamId: id };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return new PaginatedResponse(
      users.map((u) => new UserEntity(u)),
      total,
      pagination.page,
      pagination.limit,
    );
  }
}
