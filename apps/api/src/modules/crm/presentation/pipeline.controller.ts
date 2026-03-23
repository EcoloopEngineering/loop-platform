import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole, CLOSER_PIPELINE_STAGES, PROJECT_MANAGER_PIPELINE_STAGES } from '@loop/shared';
import { GetPipelineViewQuery } from '../application/queries/get-pipeline-view.handler';

@ApiTags('Pipeline')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('pipeline')
export class PipelineController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get kanban pipeline view with leads grouped by stage' })
  async getPipelineView(
    @Query('pipelineId') pipelineId?: string,
    @Query('search') search?: string,
    @Query('source') source?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<any> {
    return this.queryBus.execute(new GetPipelineViewQuery(pipelineId, search, source, dateFrom, dateTo));
  }

  @Get('stages')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get available pipeline stage definitions' })
  getStages(): any {
    return {
      closer: CLOSER_PIPELINE_STAGES,
      projectManager: PROJECT_MANAGER_PIPELINE_STAGES,
    };
  }
}
