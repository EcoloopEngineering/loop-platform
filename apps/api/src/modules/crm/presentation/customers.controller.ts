import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Inject,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole, CustomerType } from '@loop/shared';
import { PaginationDto, PaginatedResponse } from '../../../common/dto/pagination.dto';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepositoryPort,
} from '../application/ports/customer.repository.port';
import {
  PROPERTY_REPOSITORY,
  PropertyRepositoryPort,
} from '../application/ports/property.repository.port';
import { CustomerEntity } from '../domain/entities/customer.entity';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: CustomerRepositoryPort,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepo: PropertyRepositoryPort,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'List customers with pagination' })
  @ApiQuery({ name: 'type', required: false, enum: CustomerType })
  async list(
    @Query() query: PaginationDto,
    @Query('type') type?: CustomerType,
  ): Promise<PaginatedResponse<CustomerEntity>> {
    const { data, total } = await this.customerRepo.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      type,
    });
    return new PaginatedResponse(data, total, query.page, query.limit);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Get customer by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CustomerEntity> {
    const customer = await this.customerRepo.findById(id);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Create a new customer' })
  async create(
    @Body()
    body: {
      email?: string;
      phone?: string;
      source?: string;
      type?: CustomerType;
      lastName?: string;
      firstName?: string;
      socialLink?: string;
      address?: {
        zip?: string;
        city?: string;
        state?: string;
        latitude?: number;
        longitude?: number;
        streetAddress?: string;
      };
    },
  ): Promise<CustomerEntity> {
    const { address, ...customerData } = body;
    const customer = await this.customerRepo.create(customerData);

    if (address?.streetAddress) {
      await this.propertyRepo.create({
        ...address,
        zip: address.zip ?? '',
        city: address.city ?? '',
        state: address.state ?? '',
        customerId: customer.id,
        streetAddress: address.streetAddress,
      });
    }

    return customer;
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Update a customer' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      email?: string;
      phone?: string;
      source?: string;
      lastName?: string;
      firstName?: string;
      socialLink?: string;
    },
  ): Promise<CustomerEntity> {
    const existing = await this.customerRepo.findById(id);

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    return this.customerRepo.update(id, body);
  }

  @Patch(':id/convert')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP)
  @ApiOperation({ summary: 'Convert a prospect to lead type' })
  async convertToLead(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerEntity> {
    const customer = await this.customerRepo.findById(id);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.type === CustomerType.LEAD) {
      return customer;
    }

    return this.customerRepo.update(id, { type: CustomerType.LEAD });
  }
}
