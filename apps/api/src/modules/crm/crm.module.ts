import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// Domain services
import { LeadScoringDomainService } from './domain/services/lead-scoring.domain-service';

// Command handlers
import { CreateLeadHandler } from './application/commands/create-lead.handler';
import { ChangeLeadStageHandler } from './application/commands/change-lead-stage.command';
import { MarkLeadLostHandler } from './application/commands/mark-lead-lost.command';
import { MarkLeadCancelledHandler } from './application/commands/mark-lead-cancelled.command';
import { UpdateLeadMetadataHandler } from './application/commands/update-lead-metadata.command';
import { AutoAdvanceInstallsHandler } from './application/commands/auto-advance-installs.handler';

// Query handlers
import { ListLeadsHandler } from './application/queries/list-leads.handler';
import { GetPipelineViewHandler } from './application/queries/get-pipeline-view.handler';

// Repository ports
import { LEAD_REPOSITORY } from './application/ports/lead.repository.port';
import { CUSTOMER_REPOSITORY } from './application/ports/customer.repository.port';
import { PROPERTY_REPOSITORY } from './application/ports/property.repository.port';

// Repository implementations
import { PrismaLeadRepository } from './infrastructure/repositories/prisma-lead.repository';
import { PrismaCustomerRepository } from './infrastructure/repositories/prisma-customer.repository';
import { PrismaPropertyRepository } from './infrastructure/repositories/prisma-property.repository';

// Application services
import { LeadNoteService } from './application/services/lead-note.service';
import { LeadAssignmentService } from './application/services/lead-assignment.service';
import { LeadScoringAppService } from './application/services/lead-scoring-app.service';
import { SalesRabbitWebhookService } from './application/services/salesrabbit-webhook.service';
import { PortalAuthService } from './application/services/portal-auth.service';

// Listeners
import { StageAdvanceListener } from './application/listeners/stage-advance.listener';
import { LeadTransitionListener } from './application/listeners/lead-transition.listener';

// Controllers
import { LeadsController } from './presentation/leads.controller';
import { LeadNotesController } from './presentation/lead-notes.controller';
import { LeadAssignmentsController } from './presentation/lead-assignments.controller';
import { CustomersController } from './presentation/customers.controller';
import { PipelineController } from './presentation/pipeline.controller';
import { SalesRabbitWebhookController } from './presentation/salesrabbit-webhook.controller';
import { PortalController } from './presentation/portal.controller';

const CommandHandlers = [
  CreateLeadHandler,
  ChangeLeadStageHandler,
  MarkLeadLostHandler,
  MarkLeadCancelledHandler,
  UpdateLeadMetadataHandler,
];
const QueryHandlers = [ListLeadsHandler, GetPipelineViewHandler];
const CronHandlers = [AutoAdvanceInstallsHandler];
const Listeners = [StageAdvanceListener, LeadTransitionListener];

@Module({
  imports: [CqrsModule, ConfigModule, ScheduleModule.forRoot()],
  controllers: [
    LeadsController,
    LeadNotesController,
    LeadAssignmentsController,
    CustomersController,
    PipelineController,
    SalesRabbitWebhookController,
    PortalController,
  ],
  providers: [
    PrismaService,
    LeadScoringDomainService,
    LeadNoteService,
    LeadAssignmentService,
    LeadScoringAppService,
    SalesRabbitWebhookService,
    PortalAuthService,
    ...CommandHandlers,
    ...QueryHandlers,
    ...CronHandlers,
    ...Listeners,
    {
      provide: LEAD_REPOSITORY,
      useClass: PrismaLeadRepository,
    },
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: PrismaCustomerRepository,
    },
    {
      provide: PROPERTY_REPOSITORY,
      useClass: PrismaPropertyRepository,
    },
  ],
  exports: [LEAD_REPOSITORY, CUSTOMER_REPOSITORY, PROPERTY_REPOSITORY, LeadScoringDomainService],
})
export class CrmModule {}
