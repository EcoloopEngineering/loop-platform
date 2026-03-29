import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { JobberService } from './jobber.service';

describe('JobberService', () => {
  let service: JobberService;
  let http: { post: jest.Mock };

  beforeEach(async () => {
    http = { post: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        JobberService,
        { provide: HttpService, useValue: http },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              const map: Record<string, string> = {
                JOBBER_SERVICE_URL: 'https://jobber.test/graphql',
                JOBBER_SERVICE_TOKEN: 'jb-tok',
              };
              return map[key] ?? fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(JobberService);
  });

  it('should fetch availability slots', async () => {
    http.post.mockReturnValue(of({
      data: {
        data: {
          availabilitySlots: {
            nodes: [
              { start: '2026-04-01T09:00:00Z', end: '2026-04-01T10:00:00Z', available: true },
            ],
          },
        },
      },
    }));

    const result = await service.getAvailabilitySlots('INSTALL', 30, -97, '2026-04-01', '2026-04-02');

    expect(result).toHaveLength(1);
    expect(http.post).toHaveBeenCalledWith(
      'https://jobber.test/graphql',
      expect.objectContaining({ variables: expect.objectContaining({ type: 'INSTALL' }) }),
      expect.anything(),
    );
  });

  it('should create a booking', async () => {
    http.post.mockReturnValue(of({
      data: {
        data: {
          jobCreate: {
            job: { id: 'j1', title: 'Install', status: 'SCHEDULED', startAt: '2026-04-01T09:00:00Z', endAt: '2026-04-01T12:00:00Z', visitId: 'v1' },
          },
        },
      },
    }));

    const result = await service.createBooking({ title: 'Install' } as any);

    expect(result).toBeDefined();
    expect(http.post).toHaveBeenCalled();
  });

  it('should cancel a visit', async () => {
    http.post.mockReturnValue(of({
      data: {
        data: {
          visitCancel: {
            visit: { id: 'v1', status: 'CANCELLED' },
          },
        },
      },
    }));

    const result = await service.cancelVisit('v1');

    expect(result).toBeDefined();
  });

  it('should report isConfigured as true when env vars present', () => {
    expect(service.isConfigured()).toBe(true);
  });

  it('should report isConfigured as false when env vars missing', async () => {
    const module = await Test.createTestingModule({
      providers: [
        JobberService,
        { provide: HttpService, useValue: http },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, fallback?: string) => fallback) },
        },
      ],
    }).compile();

    const unconfigured = module.get(JobberService);
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('should throw when not configured', async () => {
    const module = await Test.createTestingModule({
      providers: [
        JobberService,
        { provide: HttpService, useValue: http },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, fallback?: string) => fallback) },
        },
      ],
    }).compile();

    const unconfigured = module.get(JobberService);
    await expect(
      unconfigured.getAvailabilitySlots('INSTALL', 0, 0, '', ''),
    ).rejects.toThrow('Jobber integration is not configured');
  });

  it('should retry on transient failure then succeed', async () => {
    http.post
      .mockReturnValueOnce(throwError(() => new Error('ECONNRESET')))
      .mockReturnValue(of({
        data: {
          data: {
            availabilitySlots: {
              nodes: [{ start: '2026-04-01T09:00:00Z', end: '2026-04-01T10:00:00Z', available: true }],
            },
          },
        },
      }));

    const result = await service.getAvailabilitySlots('INSTALL', 30, -97, '2026-04-01', '2026-04-02');

    expect(result).toHaveLength(1);
    expect(http.post).toHaveBeenCalledTimes(2);
  });
});
