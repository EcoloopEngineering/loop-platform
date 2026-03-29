import { Test, TestingModule } from '@nestjs/testing';
import { PortalController } from './portal.controller';
import { PortalAuthService } from '../application/services/portal-auth.service';

const mockPortalAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  getMe: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<PortalController>(PortalController);
  });

  describe('register', () => {
    it('delegates to PortalAuthService.register', async () => {
      const dto = { firstName: 'Ana', lastName: 'Silva', email: 'ana@example.com', password: 'password123' };
      const expected = { token: 'tok', customer: { id: 'c1' } };
      mockPortalAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto as any);

      expect(result).toBe(expected);
      expect(mockPortalAuthService.register).toHaveBeenCalledWith(dto);
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
    it('delegates to PortalAuthService.forgotPassword with email', async () => {
      const expected = { message: 'If an account exists...' };
      mockPortalAuthService.forgotPassword.mockResolvedValue(expected);

      const result = await controller.forgotPassword({ email: 'ana@example.com' } as any);

      expect(result).toBe(expected);
      expect(mockPortalAuthService.forgotPassword).toHaveBeenCalledWith('ana@example.com');
    });
  });

  describe('resetPassword', () => {
    it('delegates to PortalAuthService.resetPassword with token and password', async () => {
      const expected = { message: 'Password reset successfully.' };
      mockPortalAuthService.resetPassword.mockResolvedValue(expected);

      const result = await controller.resetPassword({ token: 'tok123', password: 'newpass12' } as any);

      expect(result).toBe(expected);
      expect(mockPortalAuthService.resetPassword).toHaveBeenCalledWith('tok123', 'newpass12');
    });
  });
});
