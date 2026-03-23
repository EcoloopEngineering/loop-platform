import { Test } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.helper';

describe('FirebaseAuthGuard', () => {
  let guard: FirebaseAuthGuard;
  let reflector: Reflector;
  let firebaseService: { isConfigured: jest.Mock; verifyIdToken: jest.Mock };
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    firebaseService = {
      isConfigured: jest.fn().mockReturnValue(false),
      verifyIdToken: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        FirebaseAuthGuard,
        { provide: FirebaseService, useValue: firebaseService },
        { provide: PrismaService, useValue: prisma },
        Reflector,
      ],
    }).compile();

    guard = module.get(FirebaseAuthGuard);
    reflector = module.get(Reflector);
  });

  function mockContext(headers: Record<string, string> = {}, isPublic = false): ExecutionContext {
    const request = { headers, user: undefined as any };
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as any;
  }

  it('should allow access when route is public', async () => {
    const ctx = mockContext({}, true);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should dev-bypass when no token and firebase not configured', async () => {
    const devUser = { id: '1', name: 'Dev', email: 'dev@test.com', isActive: true };
    prisma.user.findFirst.mockResolvedValue(devUser);

    const ctx = mockContext({});
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toEqual(devUser);
  });

  it('should assign mock user in dev bypass when no users exist', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const ctx = mockContext({});
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toHaveProperty('email', 'dev@localhost');
  });

  it('should throw UnauthorizedException when token is missing and firebase is configured', async () => {
    firebaseService.isConfigured.mockReturnValue(true);
    const ctx = mockContext({});

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for invalid token', async () => {
    firebaseService.isConfigured.mockReturnValue(true);
    firebaseService.verifyIdToken.mockRejectedValue(new Error('bad token'));

    const ctx = mockContext({ authorization: 'Bearer bad-token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
