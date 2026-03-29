import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LeadOwnershipGuard, SKIP_OWNERSHIP_KEY } from './lead-ownership.guard';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../test/prisma-mock.helper';
import { UserRole } from '@loop/shared';

describe('LeadOwnershipGuard', () => {
  let guard: LeadOwnershipGuard;
  let reflector: Reflector;
  let prisma: MockPrismaService;

  const leadId = 'lead-123';
  const userId = 'user-456';

  function createMockContext(overrides: {
    user?: any;
    params?: any;
    routePath?: string;
  }): ExecutionContext {
    const request = {
      user: overrides.user ?? null,
      params: overrides.params ?? {},
      route: { path: overrides.routePath ?? '/api/v1/leads/:id' },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = new Reflector();
    prisma = createMockPrismaService();
    guard = new LeadOwnershipGuard(
      reflector,
      prisma as unknown as PrismaService,
    );
  });

  it('should allow ADMIN always', async () => {
    const ctx = createMockContext({
      user: { id: userId, role: UserRole.ADMIN },
      params: { id: leadId },
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should allow MANAGER always', async () => {
    const ctx = createMockContext({
      user: { id: userId, role: UserRole.MANAGER },
      params: { id: leadId },
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should allow SALES_REP when assigned to lead', async () => {
    prisma.leadAssignment.findFirst.mockResolvedValue({ id: 'a1', leadId, userId });
    const ctx = createMockContext({
      user: { id: userId, role: UserRole.SALES_REP },
      params: { id: leadId },
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should deny SALES_REP when not assigned and not PM/creator', async () => {
    prisma.leadAssignment.findFirst.mockResolvedValue(null);
    prisma.lead.findUnique.mockResolvedValue({
      projectManagerId: 'other-user',
      createdById: 'another-user',
    });
    const ctx = createMockContext({
      user: { id: userId, role: UserRole.SALES_REP },
      params: { id: leadId },
    });
    expect(await guard.canActivate(ctx)).toBe(false);
  });

  it('should allow SALES_REP when PM of the lead', async () => {
    prisma.leadAssignment.findFirst.mockResolvedValue(null);
    prisma.lead.findUnique.mockResolvedValue({
      projectManagerId: userId,
      createdById: 'other-user',
    });
    const ctx = createMockContext({
      user: { id: userId, role: UserRole.SALES_REP },
      params: { id: leadId },
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should allow SALES_REP when creator of the lead', async () => {
    prisma.leadAssignment.findFirst.mockResolvedValue(null);
    prisma.lead.findUnique.mockResolvedValue({
      projectManagerId: 'other-user',
      createdById: userId,
    });
    const ctx = createMockContext({
      user: { id: userId, role: UserRole.SALES_REP },
      params: { id: leadId },
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should allow REFERRAL when they created the lead', async () => {
    prisma.lead.findUnique.mockResolvedValue({ createdById: userId });
    const ctx = createMockContext({
      user: { id: userId, role: UserRole.REFERRAL },
      params: { id: leadId },
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should deny REFERRAL for leads they did not create', async () => {
    prisma.lead.findUnique.mockResolvedValue({ createdById: 'other-user' });
    const ctx = createMockContext({
      user: { id: userId, role: UserRole.REFERRAL },
      params: { id: leadId },
    });
    expect(await guard.canActivate(ctx)).toBe(false);
  });

  it('should skip when @SkipOwnership decorator is present', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(true);
    const ctx = createMockContext({
      user: { id: userId, role: UserRole.SALES_REP },
      params: { id: leadId },
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should skip when no leadId in params', async () => {
    const ctx = createMockContext({
      user: { id: userId, role: UserRole.SALES_REP },
      params: {},
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should skip for non-lead routes', async () => {
    const ctx = createMockContext({
      user: { id: userId, role: UserRole.SALES_REP },
      params: { id: 'some-id' },
      routePath: '/api/v1/users/:id',
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should return false when no user on request', async () => {
    const ctx = createMockContext({ user: null, params: { id: leadId } });
    expect(await guard.canActivate(ctx)).toBe(false);
  });
});
