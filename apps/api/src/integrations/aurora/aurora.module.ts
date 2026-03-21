import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuroraService } from './aurora.service';

@Module({
  imports: [HttpModule],
  providers: [AuroraService],
  exports: [AuroraService],
})
export class AuroraModule {}
