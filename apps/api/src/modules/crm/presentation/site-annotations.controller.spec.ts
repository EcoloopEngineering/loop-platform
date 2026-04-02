import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SiteAnnotationsController } from './site-annotations.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../test/prisma-mock.helper';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('SiteAnnotationsController', () => {
  let controller: SiteAnnotationsController;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteAnnotationsController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SiteAnnotationsController);
  });

  const leadId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';
  const annotationId = '33333333-3333-3333-3333-333333333333';

  const mockAnnotation = {
    id: annotationId,
    leadId,
    type: 'TREE_REMOVAL',
    geometryType: 'POINT',
    coordinates: [-73.9857, 40.7484],
    label: 'Oak tree',
    note: 'Needs removal',
    color: '#FF0000',
    createdById: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    it('should create an annotation for a valid lead and log activity', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: leadId });
      prisma.siteAnnotation.create.mockResolvedValue(mockAnnotation);
      prisma.leadActivity.create.mockResolvedValue({});

      const dto = {
        type: 'TREE_REMOVAL' as any,
        geometryType: 'POINT' as any,
        coordinates: [-73.9857, 40.7484],
        label: 'Oak tree',
        note: 'Needs removal',
        color: '#FF0000',
      };

      const result = await controller.create(leadId, dto, userId);

      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: leadId },
      });
      expect(prisma.siteAnnotation.create).toHaveBeenCalledWith({
        data: {
          leadId,
          type: dto.type,
          geometryType: dto.geometryType,
          coordinates: dto.coordinates,
          label: dto.label,
          note: dto.note,
          color: dto.color,
          createdById: userId,
        },
      });
      expect(prisma.leadActivity.create).toHaveBeenCalledWith({
        data: {
          leadId,
          userId,
          type: 'SITE_ANNOTATION',
          description: 'Site annotation added: Tree Removal at Oak tree',
          metadata: { annotationId: annotationId, annotationType: 'TREE_REMOVAL' },
        },
      });
      expect(result).toEqual(mockAnnotation);
    });

    it('should create activity without label suffix when label is absent', async () => {
      const noLabelAnnotation = { ...mockAnnotation, label: null };
      prisma.lead.findUnique.mockResolvedValue({ id: leadId });
      prisma.siteAnnotation.create.mockResolvedValue(noLabelAnnotation);
      prisma.leadActivity.create.mockResolvedValue({});

      const dto = {
        type: 'SHADE_AREA' as any,
        geometryType: 'POLYGON' as any,
        coordinates: [[0, 0], [1, 1], [2, 2]],
      };

      await controller.create(leadId, dto, userId);

      expect(prisma.leadActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'Site annotation added: Shade Area',
        }),
      });
    });

    it('should throw NotFoundException if lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(
        controller.create(
          leadId,
          {
            type: 'TREE_REMOVAL' as any,
            geometryType: 'POINT' as any,
            coordinates: [0, 0],
          },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all annotations for a lead', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: leadId });
      prisma.siteAnnotation.findMany.mockResolvedValue([mockAnnotation]);

      const result = await controller.findAll(leadId);

      expect(prisma.siteAnnotation.findMany).toHaveBeenCalledWith({
        where: { leadId },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual([mockAnnotation]);
    });

    it('should throw NotFoundException if lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      await expect(controller.findAll(leadId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an existing annotation', async () => {
      const updated = { ...mockAnnotation, label: 'Updated label' };
      prisma.siteAnnotation.findFirst.mockResolvedValue(mockAnnotation);
      prisma.siteAnnotation.update.mockResolvedValue(updated);

      const result = await controller.update(leadId, annotationId, {
        label: 'Updated label',
      });

      expect(prisma.siteAnnotation.findFirst).toHaveBeenCalledWith({
        where: { id: annotationId, leadId },
      });
      expect(prisma.siteAnnotation.update).toHaveBeenCalledWith({
        where: { id: annotationId },
        data: { label: 'Updated label' },
      });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException if annotation does not exist', async () => {
      prisma.siteAnnotation.findFirst.mockResolvedValue(null);

      await expect(
        controller.update(leadId, annotationId, { label: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an existing annotation and log activity', async () => {
      prisma.siteAnnotation.findFirst.mockResolvedValue(mockAnnotation);
      prisma.siteAnnotation.delete.mockResolvedValue(mockAnnotation);
      prisma.leadActivity.create.mockResolvedValue({});

      const result = await controller.remove(leadId, annotationId, userId);

      expect(prisma.siteAnnotation.delete).toHaveBeenCalledWith({
        where: { id: annotationId },
      });
      expect(prisma.leadActivity.create).toHaveBeenCalledWith({
        data: {
          leadId,
          userId,
          type: 'SITE_ANNOTATION',
          description: 'Site annotation removed: Tree Removal at Oak tree',
          metadata: { annotationId, annotationType: 'TREE_REMOVAL' },
        },
      });
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if annotation does not exist', async () => {
      prisma.siteAnnotation.findFirst.mockResolvedValue(null);

      await expect(
        controller.remove(leadId, annotationId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
