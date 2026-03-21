import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from '../ports/user.repository.port';
import { UserEntity } from '../../domain/entities/user.entity';

export class GetUserByIdQuery {
  constructor(public readonly userId: string) {}
}

export class GetUserByEmailQuery {
  constructor(public readonly email: string) {}
}

export class GetUsersQuery {
  constructor(
    public readonly skip: number,
    public readonly take: number,
    public readonly search?: string,
  ) {}
}

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(query: GetUserByIdQuery): Promise<UserEntity> {
    const user = await this.userRepository.findById(query.userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${query.userId} not found`);
    }
    return user;
  }
}

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler
  implements IQueryHandler<GetUserByEmailQuery>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(query: GetUserByEmailQuery): Promise<UserEntity> {
    const user = await this.userRepository.findByEmail(query.email);
    if (!user) {
      throw new NotFoundException(
        `User with email ${query.email} not found`,
      );
    }
    return user;
  }
}

@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(
    query: GetUsersQuery,
  ): Promise<{ data: UserEntity[]; total: number }> {
    return this.userRepository.findAll({
      skip: query.skip,
      take: query.take,
      search: query.search,
    });
  }
}
