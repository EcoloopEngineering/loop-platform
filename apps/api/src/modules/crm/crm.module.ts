import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// Domain services
import { LeadScoringDomainService } from './domain/services/lead-scoring.domain-service';

// Command handlers
import { CreateLeadHandler } from './application/commands/create-lead.handler';

// Query handlers
import { ListLeadsHandler } from './application/queries/list-leads.handler';
import { GetPipelineViewHandler } from './application/queries/get-pipeline-view.handler';

// Repository ports
import { LEAD_REPOSITORY } from './application/ports/lead.repository.port';
import { CUSTOMER_REPOSITORY } from './application/ports/customer.repository.port';

// Repository implementations
import { PrismaLeadRepository } from './infrastructure/repositories/prisma-lead.repository';
import { PrismaCustomerRepository } from './infrastructure/repositories/prisma-customer.repository';

// Controllers
import { LeadsController } from './presentation/leads.controller';
import { CustomersController } from './presentation/customers.controller';
import { PipelineController } from './presentation/pipeline.controller';

const CommandHandlers = [CreateLeadHandler];
const QueryHandlers = [ListLeadsHandler, GetPipelineViewHandler];

@Module({
  imports: [CqrsModule],
  controllers: [LeadsController, CustomersController, PipelineController],
  providers: [
    PrismaService,
    LeadScoringDomainService,
    ...CommandHandlers,
    ...QueryHandlers,
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
