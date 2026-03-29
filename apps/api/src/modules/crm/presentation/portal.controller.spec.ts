import { Test, TestingModule } from '@nestjs/testing';
import { PortalController } from './portal.controller';
import { PortalAuthService } from '../application/services/portal-auth.service';
import { PortalRegistrationService } from '../application/services/portal-registration.service';
import { PortalPasswordService } from '../application/services/portal-password.service';

const mockPortalAuthService = {
  login: jest.fn(),
  getMe: jest.fn(),
};

const mockPortalRegistrationService = {
  register: jest.fn(),
};

const mockPortalPasswordService = {
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

describe('PortalController', () => {
  let controller: PortalController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalController],
      providers: [
        { provide: PortalAuthService, useValue: mockPortalAuthService },
        { provide: PortalRegistrationService, useValue: mockPortalRegistrationService },
        { provide: PortalPasswordService, useValue: mockPortalPasswordService },
      ],
    }).compile();

    controller = module.get<PortalController>(PortalController);
  });

  describe('register', () => {
    it('delegates to PortalRegistrationService.register', async () => {
      const dto = { firstName: 'Ana', lastName: 'Silva', email: 'ana@example.com', password: 'password123' };
      const expected = { token: 'tok', customer: { id: 'c1' } };
      mockPortalRegistrationService.register.mockResolvedValue(expected);

      const result = await controller.register(dto as any);

      expect(result).toBe(expected);
      expect(mockPortalRegistrationService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('delegates to PortalAuthService.login', async () => {
      const dto = { email: 'ana@example.com', password: 'password123' };
      const expected = { token: 'tok', customer: { id: 'c1' } };
      mockPortalAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto as any);

      expect(result).toBe(expected);
      expect(mockPortalAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('getMe', () => {
    it('delegates to PortalAuthService.getMe with authorization header', async () => {
      const expected = { id: 'c1', email: 'ana@example.com' };
      mockPortalAuthService.getMe.mockResolvedValue(expected);

      const result = await controller.getMe({ headers: { authorization: 'Bearer tok' } } as any);

      expect(result).toBe(expected);
      expect(mockPortalAuthService.getMe).toHaveBeenCalledWith('Bearer tok');
    });

    it('passes undefined when no authorization header', async () => {
      mockPortalAuthService.getMe.mockRejectedValue(new Error('Not authenticated'));

      await expect(controller.getMe({ headers: {} } as any)).rejects.toThrow('Not authenticated');
      expect(mockPortalAuthService.getMe).toHaveBeenCalledWith(undefined);
    });
  });

  describe('forgotPassword', () => {
    it('delegates to PortalPasswordService.forgotPassword with email', async () => {
      const expected = { message: 'If an account exists...' };
      mockPortalPasswordService.forgotPassword.mockResolvedValue(expected);

      const result = await controller.forgotPassword({ email: 'ana@example.com' } as any);

      expect(result).toBe(expected);
      expect(mockPortalPasswordService.forgotPassword).toHaveBeenCalledWith('ana@example.com');
    });
  });

  describe('resetPassword', () => {
    it('delegates to PortalPasswordService.resetPassword with token and password', async () => {
      const expected = { message: 'Password reset successfully.' };
      mockPortalPasswordService.resetPassword.mockResolvedValue(expected);

      const result = await controller.resetPassword({ token: 'tok123', password: 'newpass12' } as any);

      expect(result).toBe(expected);
      expect(mockPortalPasswordService.resetPassword).toHaveBeenCalledWith('tok123', 'newpass12');
    });
  });
});
