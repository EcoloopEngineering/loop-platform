import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@loop/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  function createMockContext(userRole: UserRole): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: userRole } }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should return true when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext(UserRole.SALES_REP);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true when roles array is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const context = createMockContext(UserRole.SALES_REP);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true when user has the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]);
    const context = createMockContext(UserRole.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return false when user lacks the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = createMockContext(UserRole.SALES_REP);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should call reflector with ROLES_KEY and correct targets', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const context = createMockContext(UserRole.ADMIN);

    guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
