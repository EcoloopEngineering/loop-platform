import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { HubSpotSyncService } from './hubspot-sync.service';

describe('HubSpotSyncService', () => {
  let service: HubSpotSyncService;
  let http: { post: jest.Mock; get: jest.Mock; patch: jest.Mock };

  beforeEach(async () => {
    http = { post: jest.fn(), get: jest.fn(), patch: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        HubSpotSyncService,
        { provide: HttpService, useValue: http },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              const map: Record<string, string> = {
                HUBSPOT_SERVICE_URL: 'https://hs.test',
                HUBSPOT_SERVICE_TOKEN: 'hs-tok',
              };
              return map[key] ?? fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(HubSpotSyncService);
  });

  it('should push a lead as a deal', async () => {
    const raw = { id: 'deal1', properties: { dealname: 'Test', dealstage: 'NEW' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    http.post.mockReturnValue(of({ data: raw }));

    const result = await service.pushLead(
      { id: 'l1', currentStage: 'NEW_LEAD' },
      { firstName: 'John', lastName: 'Doe', email: 'j@d.com' },
      { streetAddress: '123 Main', city: 'Austin', state: 'TX', zip: '78701' },
    );

    expect(result.hubspotDealId).toBe('deal1');
    expect(http.post).toHaveBeenCalled();
  });

  it('should pull a deal by id', async () => {
    const raw = { id: 'deal1', properties: { dealname: 'Test', dealstage: 'NEW' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    http.get.mockReturnValue(of({ data: raw }));

    const result = await service.pullDeal('deal1');

    expect(result.hubspotDealId).toBe('deal1');
  });

  it('should push a contact', async () => {
    const raw = { id: 'c1', properties: { firstname: 'John', lastname: 'Doe' }, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    http.post.mockReturnValue(of({ data: raw }));

    const result = await service.pushContact({ firstName: 'John', lastName: 'Doe' });

    expect(result.hubspotContactId).toBe('c1');
  });

  it('should sync lead stage via PATCH', async () => {
    http.patch.mockReturnValue(of({ data: {} }));

    await service.syncLeadStage('lead-1', 'WON');

    expect(http.patch).toHaveBeenCalledWith(
      'https://hs.test/crm/v3/objects/deals/lead-1',
      { properties: { dealstage: 'WON' } },
      expect.anything(),
    );
  });
});
