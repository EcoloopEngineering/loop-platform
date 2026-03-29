import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@loop/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export const SKIP_OWNERSHIP_KEY = 'skipOwnership';
export const SkipOwnership = () => SetMetadata(SKIP_OWNERSHIP_KEY, true);

/**
 * Validates that the current user has access to the lead referenced in the request.
 * - ADMIN and MANAGER: always allowed (full visibility)
 * - SALES_REP: allowed only if assigned to the lead (via leadAssignment)
 * - REFERRAL: allowed only if they created the lead
 *
 * The guard looks for leadId in: params.id, params.leadId, body.leadId
 * Skipped when @SkipOwnership() is applied or no leadId is found.
 */
@Injectable()
export class LeadOwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipOwnership = this.reflector.getAllAndOverride<boolean>(
      SKIP_OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipOwnership) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    // ADMIN and MANAGER have full visibility
    if ([UserRole.ADMIN, UserRole.MANAGER].includes(user.role)) {
      return true;
    }

    // Extract leadId from route params
    const leadId = request.params?.leadId || request.params?.id;
    if (!leadId) return true; // No lead context — allow (other guards handle authorization)

    // Check if this is actually a lead-related route (avoid false positives on other :id routes)
    const path = request.route?.path || '';
    const isLeadRoute =
      path.includes('lead') ||
      path.includes('commission') ||
      path.includes('design') ||
      path.includes('document') ||
      path.includes('appointment') ||
      path.includes('note');
    if (!isLeadRoute) return true;

    // SALES_REP: check assignment
    if (user.role === UserRole.SALES_REP) {
      const assignment = await this.prisma.leadAssignment.findFirst({
        where: { leadId, userId: user.id },
      });
      if (assignment) return true;

      // Also allow if user is the PM or creator
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { projectManagerId: true, createdById: true },
      });
      return lead?.projectManagerId === user.id || lead?.createdById === user.id;
    }

    // REFERRAL: check if they created the lead
    if (user.role === UserRole.REFERRAL) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { createdById: true },
      });
      return lead?.createdById === user.id;
    }

    return false;
  }
}
