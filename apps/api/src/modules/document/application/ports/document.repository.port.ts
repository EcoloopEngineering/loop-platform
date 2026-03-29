export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');

export interface DocumentRepositoryPort {
  findLeadById(leadId: string): Promise<any | null>;

  createDocument(data: {
    leadId: string;
    type: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileKey: string;
    uploadedById: string;
    metadata: Record<string, unknown>;
  }): Promise<any>;

  createLeadActivity(data: {
    leadId: string;
    userId: string;
    type: string;
    description: string;
    metadata: Record<string, unknown>;
  }): Promise<any>;

  findDocumentsByLead(leadId: string): Promise<any[]>;

  findDocumentById(id: string): Promise<any | null>;

  deleteDocument(id: string): Promise<void>;
}
