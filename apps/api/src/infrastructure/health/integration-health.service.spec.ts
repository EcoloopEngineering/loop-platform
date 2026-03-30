import { IntegrationHealthService, IntegrationInfo } from './integration-health.service';
import { CircuitState } from '../../common/utils/resilience';

describe('IntegrationHealthService', () => {
  let service: IntegrationHealthService;

  beforeEach(() => {
    service = new IntegrationHealthService();
  });

  describe('register', () => {
    it('should register an integration', () => {
      service.register({
        name: 'test',
        isConfigured: () => true,
        getCircuitState: () => CircuitState.CLOSED,
      });

      expect(service.getRegisteredNames()).toContain('test');
    });
  });

  describe('checkIntegration', () => {
    it('should return not_configured for unknown integration', () => {
      const result = service.checkIntegration('unknown');

      expect(result.configured).toBe(false);
      expect(result.status).toBe('not_configured');
    });

    it('should return not_configured when integration is not configured', () => {
      service.register({
        name: 'test',
        isConfigured: () => false,
        getCircuitState: () => CircuitState.CLOSED,
      });

      const result = service.checkIntegration('test');

      expect(result.configured).toBe(false);
      expect(result.status).toBe('not_configured');
    });

    it('should return healthy when circuit is CLOSED', () => {
      service.register({
        name: 'test',
        isConfigured: () => true,
        getCircuitState: () => CircuitState.CLOSED,
      });

      const result = service.checkIntegration('test');

      expect(result.configured).toBe(true);
      expect(result.circuitState).toBe(CircuitState.CLOSED);
      expect(result.status).toBe('healthy');
    });

    it('should return degraded when circuit is HALF_OPEN', () => {
      service.register({
        name: 'test',
        isConfigured: () => true,
        getCircuitState: () => CircuitState.HALF_OPEN,
      });

      const result = service.checkIntegration('test');

      expect(result.status).toBe('degraded');
      expect(result.circuitState).toBe(CircuitState.HALF_OPEN);
    });

    it('should return down when circuit is OPEN', () => {
      service.register({
        name: 'test',
        isConfigured: () => true,
        getCircuitState: () => CircuitState.OPEN,
      });

      const result = service.checkIntegration('test');

      expect(result.status).toBe('down');
      expect(result.circuitState).toBe(CircuitState.OPEN);
    });
  });

  describe('checkAll', () => {
    it('should return status for all registered integrations', () => {
      service.register({
        name: 'aurora',
        isConfigured: () => true,
        getCircuitState: () => CircuitState.CLOSED,
      });
      service.register({
        name: 'stripe',
        isConfigured: () => false,
        getCircuitState: () => CircuitState.CLOSED,
      });

      const result = service.checkAll();

      expect(Object.keys(result)).toEqual(['aurora', 'stripe']);
      expect(result.aurora.status).toBe('healthy');
      expect(result.stripe.status).toBe('not_configured');
    });

    it('should return empty object when no integrations registered', () => {
      const result = service.checkAll();
      expect(result).toEqual({});
    });
  });

  describe('getRegisteredNames', () => {
    it('should return empty array initially', () => {
      expect(service.getRegisteredNames()).toEqual([]);
    });

    it('should return all registered names', () => {
      service.register({
        name: 'a',
        isConfigured: () => true,
        getCircuitState: () => CircuitState.CLOSED,
      });
      service.register({
        name: 'b',
        isConfigured: () => true,
        getCircuitState: () => CircuitState.CLOSED,
      });

      expect(service.getRegisteredNames()).toEqual(['a', 'b']);
    });
  });
});
