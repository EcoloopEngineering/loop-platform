import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateLeadMetadataCommand, UpdateLeadMetadataHandler } from './update-lead-metadata.command';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';

describe('UpdateLeadMetadataHandler', () => {
  let handler: UpdateLeadMetadataHandler;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLeadMetadataHandler,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    handler = module.get(UpdateLeadMetadataHandler);
  });

  it('should merge new data with existing metadata and save', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      metadata: { existingKey: 'existingValue' },
    });
    prisma.lead.update.mockResolvedValue({ id: 'lead-1', metadata: { existingKey: 'existingValue', newKey: 'newValue' } });
    prisma.leadActivity.create.mockResolvedValue({});

    const command = new UpdateLeadMetadataCommand('lead-1', { newKey: 'newValue' }, 'user-1');
    await handler.execute(command);

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { metadata: { existingKey: 'existingValue', newKey: 'newValue' } },
    });
  });

  it('should handle lead with null metadata', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1', metadata: null });
    prisma.lead.update.mockResolvedValue({ id: 'lead-1', metadata: { key: 'value' } });
    prisma.leadActivity.create.mockResolvedValue({});

    const command = new UpdateLeadMetadataCommand('lead-1', { key: 'value' }, 'user-1');
    await handler.execute(command);

    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { metadata: { key: 'value' } },
    });
  });

  it('should throw NotFoundException when lead not found', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);

    const command = new UpdateLeadMetadataCommand('bad-id', { key: 'value' }, 'user-1');
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});
