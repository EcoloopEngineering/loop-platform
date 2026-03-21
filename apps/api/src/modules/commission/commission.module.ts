import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { CommissionController } from './presentation/commission.controller';
import { CalculateCommissionHandler } from './application/commands/calculate-commission.handler';
import { CommissionCalculatorDomainService } from './domain/services/commission-calculator.domain-service';

const CommandHandlers = [CalculateCommissionHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [CommissionController],
  providers: [...CommandHandlers, CommissionCalculatorDomainService],
  exports: [CommissionCalculatorDomainService],
})
export class CommissionModule {}
