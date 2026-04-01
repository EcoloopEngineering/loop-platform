import { Injectable, Inject, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import { normalizeName } from '../../../../common/utils/normalize-name';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
    @Inject(REFERRAL_REPOSITORY)
    private readonly referralRepo: ReferralRepositoryPort,
    private readonly authService: AuthService,
    private readonly emitter: EventEmitter2,
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

    // Non-ecoloop emails MUST provide an invitation code
    if (!isEmployee && !params.inviteCode) {
      throw new BadRequestException(
        'Registration requires an invitation. Please contact your ecoLoop representative.',
      );
    }

    // Validate invitation code for non-employees before creating user
    let inviter: { id: string } | null = null;
    if (!isEmployee && params.inviteCode) {
      inviter = await this.userRepo.findByInvitationCode(params.inviteCode);
      if (!inviter) {
        throw new BadRequestException('Invalid invitation code.');
      }
    }

    const role: UserRole = isEmployee ? UserRole.SALES_REP : UserRole.REFERRAL;

    // Partners with valid invite code are pre-approved (auto-activated)
    const isPreApproved = !isEmployee && !!inviter;

    const user = await this.userRepo.createRaw({
      email: params.email.toLowerCase(),
      passwordHash,
      firstName: normalizeName(params.firstName),
      lastName: normalizeName(params.lastName),
      phone: params.phone,
      role,
      isActive: isPreApproved,
      firebaseUid: `jwt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
    });

    if (inviter) {
      await this.handleReferral(params.inviteCode!, user.id);
    }

    this.emitter.emit('user.registered', {
      userId: user.id,
      email: user.email,
      role,
      isEmployee,
    });

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
