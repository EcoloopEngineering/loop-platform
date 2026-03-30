import { Test, TestingModule } from '@nestjs/testing';
import { PrismaUserRepository } from './prisma-user.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/prisma-mock.helper';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserRole } from '@loop/shared';

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaUserRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PrismaUserRepository>(PrismaUserRepository);
  });

  describe('findById', () => {
    it('should return a UserEntity when user exists', async () => {
      const userData = { id: 'user-1', email: 'test@example.com', firstName: 'John', lastName: 'Doe', role: 'ADMIN' };
      prisma.user.findUnique.mockResolvedValue(userData);

      const result = await repository.findById('user-1');

      expect(result).toBeInstanceOf(UserEntity);
      expect(result?.id).toBe('user-1');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('should return null when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return a UserEntity when found by email', async () => {
      const userData = { id: 'user-1', email: 'test@example.com' };
      prisma.user.findUnique.mockResolvedValue(userData);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toBeInstanceOf(UserEntity);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should return null when email not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('none@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByFirebaseUid', () => {
    it('should return a UserEntity when found by firebaseUid', async () => {
      const userData = { id: 'user-1', firebaseUid: 'fb-123' };
      prisma.user.findUnique.mockResolvedValue(userData);

      const result = await repository.findByFirebaseUid('fb-123');

      expect(result).toBeInstanceOf(UserEntity);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { firebaseUid: 'fb-123' } });
    });
  });

  describe('create', () => {
    it('should create and return a UserEntity', async () => {
      const data = { email: 'new@example.com', firstName: 'Jane', lastName: 'Doe', firebaseUid: 'fb-1', role: UserRole.SALES_REP };
      const created = { id: 'user-2', ...data };
      prisma.user.create.mockResolvedValue(created);

      const result = await repository.create(data);

      expect(result).toBeInstanceOf(UserEntity);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          firebaseUid: data.firebaseUid,
          phone: null,
          role: data.role,
        },
      });
    });
  });

  describe('update', () => {
    it('should update and return a UserEntity', async () => {
      const updated = { id: 'user-1', firstName: 'Updated' };
      prisma.user.update.mockResolvedValue(updated);

      const result = await repository.update('user-1', { firstName: 'Updated' });

      expect(result).toBeInstanceOf(UserEntity);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ firstName: 'Updated' }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return data and total count', async () => {
      const users = [{ id: 'u1', referralsReceived: [], _count: { leadAssignments: 0 } }];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(1);

      const result = await repository.findAll({ skip: 0, take: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply search filter', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await repository.findAll({ skip: 0, take: 20, search: 'John' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('findRawById', () => {
    it('should return raw user record', async () => {
      const raw = { id: 'user-1', email: 'test@example.com' };
      prisma.user.findUnique.mockResolvedValue(raw);

      const result = await repository.findRawById('user-1');

      expect(result).toEqual(raw);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });
  });

  describe('findRawByEmail', () => {
    it('should return raw user record by email', async () => {
      const raw = { id: 'user-1', email: 'test@example.com' };
      prisma.user.findUnique.mockResolvedValue(raw);

      const result = await repository.findRawByEmail('test@example.com');

      expect(result).toEqual(raw);
    });
  });

  describe('findByInvitationCode', () => {
    it('should return user by invitation code', async () => {
      const raw = { id: 'user-1', invitationCode: 'CODE123' };
      prisma.user.findUnique.mockResolvedValue(raw);

      const result = await repository.findByInvitationCode('CODE123');

      expect(result).toEqual(raw);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { invitationCode: 'CODE123' } });
    });
  });

  describe('createRaw', () => {
    it('should create a raw user record', async () => {
      const data = {
        email: 'new@example.com',
        passwordHash: 'hashed',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.SALES_REP,
        isActive: true,
        firebaseUid: 'fb-2',
      };
      const created = { id: 'user-2', ...data };
      prisma.user.create.mockResolvedValue(created);

      const result = await repository.createRaw(data);

      expect(result).toEqual(created);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: data.email }),
      });
    });
  });

  describe('updateRaw', () => {
    it('should update a raw user record', async () => {
      const updated = { id: 'user-1', firstName: 'Updated' };
      prisma.user.update.mockResolvedValue(updated);

      const result = await repository.updateRaw('user-1', { firstName: 'Updated' });

      expect(result).toEqual(updated);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { firstName: 'Updated' },
      });
    });
  });

  describe('findFirstByMetadataPath', () => {
    it('should find user by metadata path', async () => {
      const user = { id: 'user-1' };
      prisma.user.findFirst.mockResolvedValue(user);

      const result = await repository.findFirstByMetadataPath(['salesrabbit', 'id'], '12345');

      expect(result).toEqual(user);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          isActive: true,
          metadata: { path: ['salesrabbit', 'id'], equals: '12345' },
        },
      });
    });
  });

  describe('findSelectById', () => {
    it('should return selected fields', async () => {
      const partial = { firstName: 'John', lastName: 'Doe' };
      prisma.user.findUnique.mockResolvedValue(partial);

      const result = await repository.findSelectById('user-1', { firstName: true, lastName: true });

      expect(result).toEqual(partial);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { firstName: true, lastName: true },
      });
    });
  });

  describe('deleteById', () => {
    it('should delete user by ID', async () => {
      prisma.user.delete.mockResolvedValue({ id: 'user-1' });

      await repository.deleteById('user-1');

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });
  });
});
