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
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { BookAppointmentCommand } from '../application/commands/book-appointment.handler';
import { GetAvailabilityQuery } from '../application/queries/get-availability.handler';
import { AppointmentService } from '../application/services/appointment.service';
import { AppointmentType } from '../domain/entities/appointment.entity';

@ApiTags('scheduling')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller()
export class SchedulingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly appointmentService: AppointmentService,
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
    @CurrentUser() _user: AuthenticatedUser,
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
    return this.appointmentService.reschedule(id, dto.scheduledAt, dto.duration);
  }

  @Put('appointments/:id/cancel')
  @ApiOperation({ summary: 'Cancel an appointment' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: { reason: string },
  ) {
    return this.appointmentService.cancel(id, dto.reason);
  }
}
