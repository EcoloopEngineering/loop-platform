import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@loop/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CreateDesignRequestDto } from '../application/dto/design-request.dto';
import { RequestDesignCommand } from '../application/commands/request-design.handler';
import { DesignQueryService } from '../application/services/design-query.service';
import { AuroraService } from '../../../integrations/aurora/aurora.service';

@ApiTags('designs')
@ApiBearerAuth()
@Controller()
export class DesignController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly designQueryService: DesignQueryService,
    private readonly auroraService: AuroraService,
  ) {}

  @Post('leads/:leadId/designs')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get all design requests for a lead' })
  async getDesignsByLead(@Param('leadId') leadId: string) {
    return this.designQueryService.getDesignsByLead(leadId);
  }

  @Get('designs/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get a design request by ID' })
  async getDesignById(@Param('id') id: string) {
    return this.designQueryService.getDesignById(id);
  }

  @Get('leads/:leadId/design-financing')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get Aurora financing data for a lead design' })
  async getDesignFinancing(
    @Param('leadId', ParseUUIDPipe) leadId: string,
  ) {
    const designs = await this.designQueryService.getDesignsByLead(leadId);
    if (!designs || designs.length === 0) {
      throw new NotFoundException('No design found for this lead');
    }

    const designWithAurora = designs.find(
      (d: any) => d.auroraProjectId && d.designSoldId,
    ) ?? designs.find((d: any) => d.auroraProjectId);

    if (!designWithAurora) {
      throw new NotFoundException('No Aurora design found for this lead');
    }

    const auroraDesignId = designWithAurora.designSoldId ?? designWithAurora.auroraProjectId;
    const financing = await this.auroraService.getDesignFinancing(auroraDesignId);

    // Persist financing data to lead (fire-and-forget)
    this.designQueryService.persistFinancingData(leadId, financing);

    return financing;
  }
}
