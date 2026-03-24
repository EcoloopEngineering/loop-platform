import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { USER_REPOSITORY } from './application/ports/user.repository.port';
import { CreateUserHandler } from './application/commands/create-user.handler';
import {
  GetUserByIdHandler,
  GetUserByEmailHandler,
  GetUsersHandler,
} from './application/queries/get-user.handler';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { UsersController } from './presentation/users.controller';
import { TeamsController } from './presentation/teams.controller';
import { ReferralsController } from './presentation/referrals.controller';
import { AuthController } from './presentation/auth.controller';
import { AuthService } from './application/services/auth.service';

const CommandHandlers = [CreateUserHandler];
const QueryHandlers = [
  GetUserByIdHandler,
  GetUserByEmailHandler,
  GetUsersHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [UsersController, TeamsController, ReferralsController, AuthController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    PrismaUserRepository,
    AuthService,
  ],
  exports: [USER_REPOSITORY, AuthService],
})
export class IdentityModule {}
