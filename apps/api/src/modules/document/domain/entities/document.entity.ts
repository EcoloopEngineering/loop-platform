export enum DocumentType {
  CONTRACT = 'CONTRACT',
  PROPOSAL = 'PROPOSAL',
  PERMIT = 'PERMIT',
  PHOTO = 'PHOTO',
  UTILITY_BILL = 'UTILITY_BILL',
  ID_DOCUMENT = 'ID_DOCUMENT',
  OTHER = 'OTHER',
}

export class DocumentEntity {
  id: string;
  leadId: string;
  type: DocumentType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  downloadUrl: string | null;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<DocumentEntity>) {
    Object.assign(this, partial);
  }
}
