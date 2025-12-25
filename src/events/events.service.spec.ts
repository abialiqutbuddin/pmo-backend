import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('EventsService', () => {
    let service: EventsService;
    let prisma: PrismaService;

    const mockPrismaService = {
        event: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        eventMembership: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            upsert: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
        },
        user: {
            findMany: jest.fn(),
        },
        department: {
            create: jest.fn(),
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn((fn) => fn(mockPrismaService)),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);
        prisma = module.get<PrismaService>(PrismaService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('bulkAddMembers', () => {
        it('should add new members and skip existing ones', async () => {
            const eventId = 'evt-1';
            const userIds = ['u1', 'u2'];

            // For u1, findFirst returns null (not exists) -> create
            // For u2, findFirst returns object (exists) -> skip

            mockPrismaService.eventMembership.findFirst
                .mockResolvedValueOnce(null) // u1
                .mockResolvedValueOnce({ id: 'mem-2' }); // u2

            mockPrismaService.eventMembership.create.mockResolvedValue({ id: 'mem-1' });

            const result = await service.bulkAddMembers(eventId, userIds, undefined, { userId: 'admin', isSuperAdmin: true });

            expect(result.added).toBe(1);
            expect(mockPrismaService.eventMembership.create).toHaveBeenCalledTimes(1);
            expect(mockPrismaService.eventMembership.create).toHaveBeenCalledWith({
                data: { eventId, userId: 'u1', departmentId: null, roleId: null }
            });
        });

        it('should return added: 0 if userIds empty', async () => {
            const result = await service.bulkAddMembers('evt-1', [], { userId: 'a', isSuperAdmin: true });
            expect(result.added).toBe(0);
        });
    });

    describe('listAssignableUsers', () => {
        it('should return users who are not members of the event', async () => {
            const eventId = 'evt-1';
            const tenantId = 'tenant-1';

            // Mock existing members
            mockPrismaService.eventMembership.findMany.mockResolvedValue([
                { userId: 'u1' }
            ]);

            // Mock users query
            const mockUsers = [{ id: 'u2', fullName: 'User 2' }];
            mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

            const result = await service.listAssignableUsers(eventId, tenantId);

            expect(mockPrismaService.eventMembership.findMany).toHaveBeenCalledWith({
                where: { eventId },
                select: { userId: true }
            });

            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
                where: {
                    tenantId,
                    isDisabled: false,
                    id: { notIn: ['u1'] }
                },
                select: expect.any(Object),
                orderBy: { fullName: 'asc' }
            });

            expect(result).toEqual(mockUsers);
        });
    });

    describe('listForUser', () => {
        it('should return events for super admin', async () => {
            mockPrismaService.event.findMany.mockResolvedValue([{ id: 'evt-1' }]);
            const result = await service.listForUser({ userId: 'u1', isSuperAdmin: true });
            expect(mockPrismaService.event.findMany).toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });

        it('should return events based on membership for regular user', async () => {
            mockPrismaService.eventMembership.findMany.mockResolvedValue([{ eventId: 'evt-1' }]);
            mockPrismaService.event.findMany.mockResolvedValue([{ id: 'evt-1' }]);

            const result = await service.listForUser({ userId: 'u1', isSuperAdmin: false });

            expect(mockPrismaService.eventMembership.findMany).toHaveBeenCalledWith({
                where: { userId: 'u1' },
                select: { eventId: true }
            });
            expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
                where: { id: { in: ['evt-1'] } },
                orderBy: { createdAt: 'desc' },
                select: expect.any(Object)
            });
            expect(result).toHaveLength(1);
        });
    });
});
