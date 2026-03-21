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
import { AppointmentType } from '../domain/entities/appointment.entity';

@ApiTags('scheduling')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller()
export class SchedulingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
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
      endAt: string;
      assignedTo: string;
      location?: string;
      notes?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.commandBus.execute(
      new BookAppointmentCommand(
        leadId,
        dto.type,
        new Date(dto.scheduledAt),
        new Date(dto.endAt),
        dto.assignedTo,
        dto.location ?? null,
        dto.notes ?? null,
        user.id,
      ),
    );
  }

  @Put('appointments/:id/reschedule')
  @ApiOperation({ summary: 'Reschedule an appointment' })
  async reschedule(
    @Param('id') id: string,
    @Body() dto: { scheduledAt: string; endAt: string },
  ) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        scheduledAt: new Date(dto.scheduledAt),
        endAt: new Date(dto.endAt),
        status: 'SCHEDULED',
      },
    });
  }

  @Put('appointments/:id/cancel')
  @ApiOperation({ summary: 'Cancel an appointment' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: { reason: string },
  ) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: dto.reason,
      },
    });
  }
}
