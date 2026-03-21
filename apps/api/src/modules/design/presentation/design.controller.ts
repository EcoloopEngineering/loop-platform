import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateDesignRequestDto } from '../application/dto/design-request.dto';
import { RequestDesignCommand } from '../application/commands/request-design.handler';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@ApiTags('designs')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller()
export class DesignController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
  ) {}

  @Post('leads/:leadId/designs')
  @ApiOperation({ summary: 'Request a new design for a lead' })
  async requestDesign(
    @Param('leadId') leadId: string,
    @Body() dto: CreateDesignRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.commandBus.execute(
      new RequestDesignCommand(
        leadId,
        dto.designType,
        dto.treeRemoval,
        dto.notes ?? null,
        user.id,
      ),
    );
  }

  @Get('leads/:leadId/designs')
  @ApiOperation({ summary: 'Get all design requests for a lead' })
  async getDesignsByLead(@Param('leadId') leadId: string) {
    return this.prisma.designRequest.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('designs/:id')
  @ApiOperation({ summary: 'Get a design request by ID' })
  async getDesignById(@Param('id') id: string) {
    return this.prisma.designRequest.findUniqueOrThrow({
      where: { id },
    });
  }
}
