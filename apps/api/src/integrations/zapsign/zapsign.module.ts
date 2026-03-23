import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ZapSignService } from './zapsign.service';

@Module({
  imports: [HttpModule],
  providers: [ZapSignService],
  exports: [ZapSignService],
})
export class ZapSignModule {}
