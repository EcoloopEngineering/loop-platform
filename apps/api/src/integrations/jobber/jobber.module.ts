import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JobberService } from './jobber.service';

@Module({
  imports: [HttpModule],
  providers: [JobberService],
  exports: [JobberService],
})
export class JobberModule {}
