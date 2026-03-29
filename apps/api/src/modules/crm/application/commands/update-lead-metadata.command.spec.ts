import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateLeadMetadataCommand, UpdateLeadMetadataHandler } from './update-lead-metadata.command';
import { LEAD_REPOSITORY } from '../ports/lead.repository.port';

describe('UpdateLeadMetadataHandler', () => {
  let handler: UpdateLeadMetadataHandler;
  let leadRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    leadRepo = {
      findLeadMetadata: jest.fn(),
      updateMetadata: jest.fn(),
      createActivity: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLeadMetadataHandler,
        { provide: LEAD_REPOSITORY, useValue: leadRepo },
      ],
    }).compile();

    handler = module.get(UpdateLeadMetadataHandler);
  });

  it('should merge new data with existing metadata and save', async () => {
    leadRepo.findLeadMetadata.mockResolvedValue({
      id: 'lead-1',
      metadata: { existingKey: 'existingValue' },
    });
    leadRepo.updateMetadata.mockResolvedValue({ id: 'lead-1', metadata: { existingKey: 'existingValue', newKey: 'newValue' } });

    const command = new UpdateLeadMetadataCommand('lead-1', { newKey: 'newValue' }, 'user-1');
    await handler.execute(command);

    expect(leadRepo.updateMetadata).toHaveBeenCalledWith('lead-1', { existingKey: 'existingValue', newKey: 'newValue' });
  });

  it('should handle lead with null metadata', async () => {
    leadRepo.findLeadMetadata.mockResolvedValue({ id: 'lead-1', metadata: null });
    leadRepo.updateMetadata.mockResolvedValue({ id: 'lead-1', metadata: { key: 'value' } });

    const command = new UpdateLeadMetadataCommand('lead-1', { key: 'value' }, 'user-1');
    await handler.execute(command);

    expect(leadRepo.updateMetadata).toHaveBeenCalledWith('lead-1', { key: 'value' });
  });

  it('should throw NotFoundException when lead not found', async () => {
    leadRepo.findLeadMetadata.mockResolvedValue(null);

    const command = new UpdateLeadMetadataCommand('bad-id', { key: 'value' }, 'user-1');
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});
