import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { CommissionController } from './presentation/commission.controller';
import { CommissionPaymentController } from './presentation/commission-payment.controller';
import { CalculateCommissionHandler } from './application/commands/calculate-commission.handler';
import { CommissionCalculatorDomainService } from './domain/services/commission-calculator.domain-service';
import { StageCommissionListener } from './application/listeners/stage-commission.listener';

const CommandHandlers = [CalculateCommissionHandler];
const Listeners = [StageCommissionListener];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [CommissionController, CommissionPaymentController],
  providers: [...CommandHandlers, ...Listeners, CommissionCalculatorDomainService],
  exports: [CommissionCalculatorDomainService],
})
export class CommissionModule {}
