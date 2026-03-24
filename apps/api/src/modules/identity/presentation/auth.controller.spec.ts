import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../application/services/auth.service';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Partial<AuthService>>;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should call authService.register with dto', async () => {
      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      };
      const expected = { user: { id: '1', email: 'john@example.com' }, token: 'jwt-token' };
      (authService.register as jest.Mock).mockResolvedValue(expected);

      const result = await controller.register(dto as any);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    it('should call authService.login with email and password', async () => {
      const dto = { email: 'john@example.com', password: 'password123' };
      const expected = { user: { id: '1' }, token: 'jwt-token' };
      (authService.login as jest.Mock).mockResolvedValue(expected);

      const result = await controller.login(dto as any);

      expect(authService.login).toHaveBeenCalledWith('john@example.com', 'password123');
      expect(result).toEqual(expected);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshToken with userId', async () => {
      const expected = { token: 'new-jwt-token' };
      (authService.refreshToken as jest.Mock).mockResolvedValue(expected);

      const result = await controller.refresh('user-1');

      expect(authService.refreshToken).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });

  describe('me', () => {
    it('should return sanitized user data', async () => {
      const user = {
        id: 'user-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-1234',
        role: 'SALES_REP',
        isActive: true,
        passwordHash: 'should-not-appear',
      };

      const result = await controller.me(user);

      expect(result).toEqual({
        id: 'user-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-1234',
        role: 'SALES_REP',
        isActive: true,
      });
      expect((result as any).passwordHash).toBeUndefined();
    });
  });
});
