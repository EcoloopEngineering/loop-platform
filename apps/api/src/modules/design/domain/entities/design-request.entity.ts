export enum DesignStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum DesignType {
  STANDARD = 'STANDARD',
  CUSTOM = 'CUSTOM',
  REVISION = 'REVISION',
}

export class DesignRequestEntity {
  id: string;
  leadId: string;
  designType: DesignType;
  treeRemoval: boolean;
  notes: string | null;
  status: DesignStatus;
  assignedTo: string | null;
  completedAt: Date | null;
  resultUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<DesignRequestEntity>) {
    Object.assign(this, partial);
  }

  markInProgress(assignedTo: string): void {
    this.status = DesignStatus.IN_PROGRESS;
    this.assignedTo = assignedTo;
    this.updatedAt = new Date();
  }

  complete(resultUrl: string): void {
    this.status = DesignStatus.COMPLETED;
    this.resultUrl = resultUrl;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  reject(): void {
    this.status = DesignStatus.REJECTED;
    this.updatedAt = new Date();
  }
}
