import { Injectable, Inject, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { UserRole } from '@loop/shared';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../ports/user.repository.port';
import {
  REFERRAL_REPOSITORY,
  ReferralRepositoryPort,
} from '../ports/referral.repository.port';
import { AuthService } from './auth.service';
import { validatePasswordPolicy } from '../../../../common/validators/password-policy.validator';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    @Inject(REFERRAL_REPOSITORY)
    private readonly referralRepo: ReferralRepositoryPort,
    private readonly authService: AuthService,
  ) {}

  async register(params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: string;
    inviteCode?: string;
  }) {
    const existing = await this.userRepo.findRawByEmail(params.email.toLowerCase());
    if (existing) throw new ConflictException('Email already registered');

    validatePasswordPolicy(params.password);

    const passwordHash = await bcrypt.hash(params.password, 12);
    const isEmployee = params.email.toLowerCase().endsWith('@ecoloop.us');
    const role: UserRole = isEmployee ? ((params.role as UserRole) || UserRole.SALES_REP) : UserRole.SALES_REP;

    const user = await this.userRepo.createRaw({
      email: params.email.toLowerCase(),
      passwordHash,
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
      role,
      isActive: true,
      firebaseUid: `jwt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
    });

    if (params.inviteCode && !isEmployee) {
      await this.handleReferral(params.inviteCode, user.id);
    }

    return {
      user: this.authService.sanitizeUser(user),
      token: this.authService.generateToken(user),
    };
  }

  private async handleReferral(inviteCode: string, newUserId: string): Promise<void> {
    try {
      const inviter = await this.userRepo.findByInvitationCode(inviteCode);
      if (inviter) {
        await this.referralRepo.create({
          inviterId: inviter.id,
          inviteeId: newUserId,
          hierarchyPath: `${inviter.id}/${newUserId}`,
          hierarchyLevel: 1,
          status: 'ACCEPTED',
        });
        this.logger.log(`Referral linked: ${inviter.id} -> ${newUserId}`);
      }
    } catch (e: unknown) {
      this.logger.warn(`Failed to create referral: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
