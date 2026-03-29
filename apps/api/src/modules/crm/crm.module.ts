import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// Domain services
import { LeadScoringDomainService } from './domain/services/lead-scoring.domain-service';

// Command handlers
import { CreateLeadHandler } from './application/commands/create-lead.handler';
import { AutoAdvanceInstallsHandler } from './application/commands/auto-advance-installs.handler';

// Query handlers
import { ListLeadsHandler } from './application/queries/list-leads.handler';
import { GetPipelineViewHandler } from './application/queries/get-pipeline-view.handler';

// Repository ports
import { LEAD_REPOSITORY } from './application/ports/lead.repository.port';
import { CUSTOMER_REPOSITORY } from './application/ports/customer.repository.port';

// Repository implementations
import { PrismaLeadRepository } from './infrastructure/repositories/prisma-lead.repository';
import { PrismaCustomerRepository } from './infrastructure/repositories/prisma-customer.repository';

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

const CommandHandlers = [CreateLeadHandler];
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
  ],
  exports: [LEAD_REPOSITORY, CUSTOMER_REPOSITORY, LeadScoringDomainService],
})
export class CrmModule {}
