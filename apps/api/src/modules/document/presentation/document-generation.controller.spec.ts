import { Test, TestingModule } from '@nestjs/testing';
import { DocumentGenerationController } from './document-generation.controller';
import { DocumentGenerationService } from '../application/document-generation.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';

describe('DocumentGenerationController', () => {
  let controller: DocumentGenerationController;
  let documentGenerationService: Record<string, jest.Mock>;

  const mockUser = {
    id: 'user-1',
    email: 'test@ecoloop.us',
    firstName: 'Test',
    lastName: 'User',
    role: 'ADMIN',
    isActive: true,
    profileImage: null,
  } as any;

  beforeEach(async () => {
    documentGenerationService = {
      generateChangeOrder: jest.fn(),
      generateCAP: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentGenerationController],
      providers: [
        { provide: DocumentGenerationService, useValue: documentGenerationService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DocumentGenerationController>(DocumentGenerationController);
  });

  describe('generateChangeOrder', () => {
    it('should delegate to DocumentGenerationService.generateChangeOrder', async () => {
      const dto = { reason: 'Panel upgrade', changes: 'Upgraded to 400W panels' };
      const expected = { id: 'co-1', url: '/documents/co-1.pdf' };
      documentGenerationService.generateChangeOrder.mockResolvedValue(expected);

      const result = await controller.generateChangeOrder('lead-1', dto as any, mockUser);

      expect(documentGenerationService.generateChangeOrder).toHaveBeenCalledWith('lead-1', dto, mockUser);
      expect(result).toEqual(expected);
    });

    it('should propagate errors from service', async () => {
      documentGenerationService.generateChangeOrder.mockRejectedValue(new Error('PDF generation failed'));

      await expect(
        controller.generateChangeOrder('lead-1', {} as any, mockUser),
      ).rejects.toThrow('PDF generation failed');
    });
  });

  describe('generateCAP', () => {
    it('should delegate to DocumentGenerationService.generateCAP', async () => {
      const dto = { sendForSignature: true };
      const expected = { id: 'cap-1', signatureUrl: 'https://zapsign.com/doc/abc' };
      documentGenerationService.generateCAP.mockResolvedValue(expected);

      const result = await controller.generateCAP('lead-1', dto as any, mockUser);

      expect(documentGenerationService.generateCAP).toHaveBeenCalledWith('lead-1', dto, mockUser);
      expect(result).toEqual(expected);
    });

    it('should propagate errors from service', async () => {
      documentGenerationService.generateCAP.mockRejectedValue(new Error('CAP generation failed'));

      await expect(
        controller.generateCAP('lead-1', {} as any, mockUser),
      ).rejects.toThrow('CAP generation failed');
    });
  });
});
