import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import {
  DocumentGenerationService,
  ChangeOrderDto,
  CAPDto,
} from '../application/document-generation.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('leads')
export class DocumentGenerationController {
  constructor(
    private readonly documentGenerationService: DocumentGenerationService,
  ) {}

  @Post(':id/change-order')
  @ApiOperation({ summary: 'Generate a Change Order PDF for a lead' })
  async generateChangeOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentGenerationService.generateChangeOrder(id, dto, user);
  }

  @Post(':id/cap')
  @ApiOperation({
    summary: 'Generate a CAP document and optionally send for e-signature',
  })
  async generateCAP(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CAPDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentGenerationService.generateCAP(id, dto, user);
  }
}
