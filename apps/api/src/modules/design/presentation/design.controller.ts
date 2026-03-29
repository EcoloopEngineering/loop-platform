import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CreateDesignRequestDto } from '../application/dto/design-request.dto';
import { RequestDesignCommand } from '../application/commands/request-design.handler';
import { DesignQueryService } from '../application/services/design-query.service';

@ApiTags('designs')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller()
export class DesignController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly designQueryService: DesignQueryService,
  ) {}

  @Post('leads/:leadId/designs')
  @ApiOperation({ summary: 'Request a new design for a lead' })
  async requestDesign(
    @Param('leadId') leadId: string,
    @Body() dto: CreateDesignRequestDto,
    @CurrentUser() user: AuthenticatedUser,
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
    return this.designQueryService.getDesignsByLead(leadId);
  }

  @Get('designs/:id')
  @ApiOperation({ summary: 'Get a design request by ID' })
  async getDesignById(@Param('id') id: string) {
    return this.designQueryService.getDesignById(id);
  }
}
