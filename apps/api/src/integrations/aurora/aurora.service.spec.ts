import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AuroraService } from './aurora.service';

describe('AuroraService', () => {
  let service: AuroraService;
  let http: { post: jest.Mock; get: jest.Mock };

  beforeEach(async () => {
    http = { post: jest.fn(), get: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuroraService,
        { provide: HttpService, useValue: http },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              const map: Record<string, string> = {
                AURORA_SERVICE_URL: 'https://aurora.test',
                AURORA_SERVICE_TOKEN: 'tok',
              };
              return map[key] ?? fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuroraService);
  });

  it('should create a project via POST', async () => {
    const raw = { project_id: 'p1', name: 'Test', status: 'active', created_at: '2026-01-01T00:00:00Z' };
    http.post.mockReturnValue(of({ data: raw }));

    const result = await service.createProject({
      name: 'Test',
      address: { street: '123 Main', city: 'Austin', state: 'TX', zip: '78701' },
      latitude: 30,
      longitude: -97,
    });

    expect(result.projectId).toBe('p1');
    expect(http.post).toHaveBeenCalledWith(
      'https://aurora.test/projects',
      expect.anything(),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
    );
  });

  it('should get designs for a project', async () => {
    const raw = [
      { design_id: 'd1', project_id: 'p1', system_size_kw: 10, annual_production_kwh: 14000, panel_count: 30, image_url: null, status: 'complete', created_at: '2026-01-01T00:00:00Z' },
    ];
    http.get.mockReturnValue(of({ data: raw }));

    const result = await service.getDesigns('p1');

    expect(result).toHaveLength(1);
    expect(result[0].designId).toBe('d1');
  });

  it('should get design status', async () => {
    http.get.mockReturnValue(of({ data: { project_id: 'p1', status: 'processing', progress_pct: 50 } }));

    const result = await service.getDesignStatus('p1');

    expect(result).toEqual({ projectId: 'p1', status: 'processing', progressPct: 50 });
  });

  it('should report isConfigured as true when env vars present', () => {
    expect(service.isConfigured()).toBe(true);
  });

  it('should report isConfigured as false when env vars missing', async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuroraService,
        { provide: HttpService, useValue: http },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, fallback?: string) => fallback) },
        },
      ],
    }).compile();

    const unconfigured = module.get(AuroraService);
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('should throw when not configured', async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuroraService,
        { provide: HttpService, useValue: http },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, fallback?: string) => fallback) },
        },
      ],
    }).compile();

    const unconfigured = module.get(AuroraService);
    await expect(
      unconfigured.createProject({ name: 'X', address: { street: '', city: '', state: '', zip: '' }, latitude: 0, longitude: 0 }),
    ).rejects.toThrow('Aurora integration is not configured');
  });

  describe('getDesignFinancing', () => {
    let financingService: AuroraService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          AuroraService,
          { provide: HttpService, useValue: http },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, fallback?: string) => {
                const map: Record<string, string> = {
                  AURORA_SERVICE_URL: 'https://aurora.test',
                  AURORA_SERVICE_TOKEN: 'tok',
                  AURORA_TENANT_ID: 'tenant-123',
                };
                return map[key] ?? fallback;
              }),
            },
          },
        ],
      }).compile();

      financingService = module.get(AuroraService);
    });

    it('should fetch design financing data from Aurora', async () => {
      // Summary
      http.get.mockReturnValueOnce(of({
        data: {
          design: {
            system_size_stc: 8750,
            energy_production: { annual: 12345.67 },
          },
        },
      }));
      // Financings list
      http.get.mockReturnValueOnce(of({
        data: {
          financings: [
            { id: 'fin-1', selected_in_sales_mode: false },
            { id: 'fin-2', selected_in_sales_mode: true },
          ],
        },
      }));
      // Financing detail
      http.get.mockReturnValueOnce(of({
        data: {
          financing: {
            escalation: 2.9,
            solar_rate: 0.12,
            monthly_payment: 150.5,
          },
        },
      }));
      // Pricing
      http.get.mockReturnValueOnce(of({
        data: {
          pricing: {
            price_per_watt: 3.456,
            system_price: 28500,
          },
        },
      }));

      const result = await financingService.getDesignFinancing('design-abc');

      expect(result).toEqual({
        kw: 8.75,
        epc: 3.46,
        contractCost: 28500,
        escalator: 2.9,
        solarRate: 0.12,
        monthlyPayment: 150.5,
        systemProduction: 12346,
      });

      expect(http.get).toHaveBeenCalledWith(
        'https://aurora.test/tenants/tenant-123/designs/design-abc/summary',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
      );
    });

    it('should handle missing financing data gracefully', async () => {
      http.get.mockReturnValueOnce(of({
        data: { design: {} },
      }));
      http.get.mockReturnValueOnce(of({
        data: { financings: [] },
      }));
      http.get.mockReturnValueOnce(of({
        data: { pricing: {} },
      }));

      const result = await financingService.getDesignFinancing('design-xyz');

      expect(result).toEqual({
        kw: null,
        epc: null,
        contractCost: null,
        escalator: null,
        solarRate: null,
        monthlyPayment: null,
        systemProduction: null,
      });
    });

    it('should throw when tenant is not configured', async () => {
      const module = await Test.createTestingModule({
        providers: [
          AuroraService,
          { provide: HttpService, useValue: http },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, fallback?: string) => {
                const map: Record<string, string> = {
                  AURORA_SERVICE_URL: 'https://aurora.test',
                  AURORA_SERVICE_TOKEN: 'tok',
                };
                return map[key] ?? fallback;
              }),
            },
          },
        ],
      }).compile();

      const noTenantService = module.get(AuroraService);
      await expect(
        noTenantService.getDesignFinancing('design-1'),
      ).rejects.toThrow('Aurora tenant not configured');
    });

    it('should use first financing when none is selected', async () => {
      http.get.mockReturnValueOnce(of({
        data: { design: { system_size_stc: 5000 } },
      }));
      http.get.mockReturnValueOnce(of({
        data: {
          financings: [
            { id: 'fin-first', selected_in_sales_mode: false },
          ],
        },
      }));
      http.get.mockReturnValueOnce(of({
        data: { financing: { escalation: 1.5 } },
      }));
      http.get.mockReturnValueOnce(of({
        data: { pricing: { price_per_watt: 2.5 } },
      }));

      const result = await financingService.getDesignFinancing('design-fallback');

      expect(result.escalator).toBe(1.5);
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('financings/fin-first'),
        expect.anything(),
      );
    });
  });

  it('should retry on transient failure then succeed', async () => {
    http.post
      .mockReturnValueOnce(throwError(() => new Error('timeout')))
      .mockReturnValue(of({ data: { project_id: 'p2', name: 'Retry', status: 'active', created_at: '2026-01-01T00:00:00Z' } }));

    const result = await service.createProject({
      name: 'Retry',
      address: { street: '1 St', city: 'C', state: 'TX', zip: '00000' },
      latitude: 0,
      longitude: 0,
    });

    expect(result.projectId).toBe('p2');
    expect(http.post).toHaveBeenCalledTimes(2);
  });
});
