import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { USER_REPOSITORY } from './application/ports/user.repository.port';
import { REFERRAL_REPOSITORY } from './application/ports/referral.repository.port';
import { CreateUserHandler } from './application/commands/create-user.handler';
import {
  GetUserByIdHandler,
  GetUserByEmailHandler,
  GetUsersHandler,
} from './application/queries/get-user.handler';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { PrismaReferralRepository } from './infrastructure/repositories/prisma-referral.repository';
import { UsersController } from './presentation/users.controller';
import { ReferralsController } from './presentation/referrals.controller';
import { AuthController } from './presentation/auth.controller';
import { AuthService } from './application/services/auth.service';
import { RegistrationService } from './application/services/registration.service';
import { UserProfileService } from './application/services/user-profile.service';
import { ReferralService } from './application/services/referral.service';

const CommandHandlers = [CreateUserHandler];
const QueryHandlers = [
  GetUserByIdHandler,
  GetUserByEmailHandler,
  GetUsersHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [UsersController, ReferralsController, AuthController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: REFERRAL_REPOSITORY, useClass: PrismaReferralRepository },
    AuthService,
    RegistrationService,
    UserProfileService,
    ReferralService,
  ],
  exports: [USER_REPOSITORY, AuthService, RegistrationService],
})
export class IdentityModule {}
