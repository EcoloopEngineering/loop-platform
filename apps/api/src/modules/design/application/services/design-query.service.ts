import { Injectable, Inject } from '@nestjs/common';
import {
  DESIGN_REPOSITORY,
  DesignRepositoryPort,
} from '../ports/design.repository.port';

@Injectable()
export class DesignQueryService {
  constructor(
    @Inject(DESIGN_REPOSITORY)
    private readonly designRepo: DesignRepositoryPort,
  ) {}

  async getDesignsByLead(leadId: string) {
    return this.designRepo.findByLead(leadId);
  }

  async getDesignById(id: string) {
    return this.designRepo.findById(id);
  }
}
