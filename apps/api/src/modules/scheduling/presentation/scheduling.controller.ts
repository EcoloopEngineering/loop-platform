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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { BookAppointmentCommand } from '../application/commands/book-appointment.handler';
import { GetAvailabilityQuery } from '../application/queries/get-availability.handler';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { JobberService } from '../../../integrations/jobber/jobber.service';
import { AppointmentType } from '../domain/entities/appointment.entity';
import { Logger } from '@nestjs/common';

@ApiTags('scheduling')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller()
export class SchedulingController {
  private readonly logger = new Logger(SchedulingController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
    private readonly jobberService: JobberService,
  ) {}

  @Get('scheduling/availability')
  @ApiOperation({ summary: 'Get availability slots for a user on a given date' })
  async getAvailability(
    @Query('userId') userId: string,
    @Query('date') date: string,
  ) {
    return this.queryBus.execute(new GetAvailabilityQuery(userId, date));
  }

  @Post('leads/:leadId/appointments')
  @ApiOperation({ summary: 'Book a new appointment for a lead' })
  async bookAppointment(
    @Param('leadId') leadId: string,
    @Body()
    dto: {
      type: AppointmentType;
      scheduledAt: string;
      duration?: number;
      notes?: string;
    },
    @CurrentUser() _user: any,
  ) {
    return this.commandBus.execute(
      new BookAppointmentCommand(
        leadId,
        dto.type,
        new Date(dto.scheduledAt),
        dto.duration ?? 60,
        dto.notes ?? null,
      ),
    );
  }

  @Put('appointments/:id/reschedule')
  @ApiOperation({ summary: 'Reschedule an appointment' })
  async reschedule(
    @Param('id') id: string,
    @Body() dto: { scheduledAt: string; duration?: number },
  ) {
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        scheduledAt: new Date(dto.scheduledAt),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        status: 'PENDING',
      },
    });

    // Sync reschedule to Jobber
    if (appointment.jobberVisitId) {
      const jobberVisitId = appointment.jobberVisitId;
      const endAt = new Date(
        new Date(dto.scheduledAt).getTime() + (dto.duration ?? appointment.duration) * 60000,
      );
      this.jobberService
        .rescheduleVisit(jobberVisitId, dto.scheduledAt, endAt.toISOString())
        .catch((err) => this.logger.warn(`Jobber reschedule failed: ${err.message}`));
    }

    return appointment;
  }

  @Put('appointments/:id/cancel')
  @ApiOperation({ summary: 'Cancel an appointment' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: { reason: string },
  ) {
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: dto.reason,
      },
    });

    // Sync cancel to Jobber
    if (appointment.jobberVisitId) {
      this.jobberService
        .cancelVisit(appointment.jobberVisitId)
        .catch((err) => this.logger.warn(`Jobber cancel failed: ${err.message}`));
    }

    return appointment;
  }
}
