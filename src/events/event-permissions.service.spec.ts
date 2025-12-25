import { Test, TestingModule } from '@nestjs/testing';
import { EventPermissionsService } from './event-permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EventPermissionsService', () => {
    let service: EventPermissionsService;
    let prisma: PrismaService;

    // Mock data
    const mockEvent = {
        id: 'event-1',
        tenantId: 'tenant-1',
        name: 'Test Event',
    };

    const mockUser = {
        id: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        fullName: 'Test User',
    };

    const mockModule = {
        id: 'module-1',
        key: 'tasks',
        name: 'Tasks',
        features: ['read', 'create', 'update', 'delete'],
    };

    const mockEventUserPermission = {
        id: 'perm-1',
        eventId: 'event-1',
        userId: 'user-1',
        moduleId: 'module-1',
        actions: ['read', 'create'],
        module: mockModule,
        user: { id: 'user-1', fullName: 'Test User', email: 'test@example.com' },
    };

    const mockPrismaService = {
        event: {
            findUnique: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        module: {
            findUnique: jest.fn(),
        },
        eventUserPermission: {
            findMany: jest.fn(),
            upsert: jest.fn(),
            deleteMany: jest.fn(),
            createMany: jest.fn(),
            create: jest.fn(),
        },
        eventMembership: {
            findMany: jest.fn(),
        },
        $transaction: jest.fn((fn) => fn(mockPrismaService)),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventPermissionsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<EventPermissionsService>(EventPermissionsService);
        prisma = module.get<PrismaService>(PrismaService);

        // Reset mocks
        jest.clearAllMocks();
        mockPrismaService.eventMembership.findMany.mockResolvedValue([]);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getUserEventPermissions', () => {
        it('should return permissions for a user in an event', async () => {
            mockPrismaService.eventUserPermission.findMany.mockResolvedValue([
                mockEventUserPermission,
            ]);
            mockPrismaService.eventMembership.findMany.mockResolvedValue([]);

            const result = await service.getUserEventPermissions('event-1', 'user-1');

            expect(result).toEqual({ tasks: ['read', 'create'] });
            expect(mockPrismaService.eventUserPermission.findMany).toHaveBeenCalledWith({
                where: { eventId: 'event-1', userId: 'user-1' },
                include: { module: true },
            });
        });

        it('should return empty object when user has no permissions', async () => {
            mockPrismaService.eventUserPermission.findMany.mockResolvedValue([]);

            const result = await service.getUserEventPermissions('event-1', 'user-1');

            expect(result).toEqual({});
        });
    });

    describe('getFlattenedPermissions', () => {
        it('should return flattened permissions array', async () => {
            mockPrismaService.eventUserPermission.findMany.mockResolvedValue([
                mockEventUserPermission,
            ]);

            const result = await service.getFlattenedPermissions('event-1', 'user-1');

            expect(result).toEqual(['tasks:read', 'tasks:create']);
        });

        it('should return empty array when user has no permissions', async () => {
            mockPrismaService.eventUserPermission.findMany.mockResolvedValue([]);

            const result = await service.getFlattenedPermissions('event-1', 'user-1');

            expect(result).toEqual([]);
        });
    });

    describe('setUserModulePermission', () => {
        beforeEach(() => {
            mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
        });

        it('should upsert permission for valid inputs', async () => {
            mockPrismaService.eventUserPermission.upsert.mockResolvedValue({
                ...mockEventUserPermission,
                actions: ['read', 'create', 'update'],
            });

            const result = await service.setUserModulePermission(
                'event-1',
                'user-1',
                'module-1',
                ['read', 'create', 'update'],
            );

            expect((result as any).actions).toEqual(['read', 'create', 'update']);
            expect(mockPrismaService.eventUserPermission.upsert).toHaveBeenCalledWith({
                where: {
                    eventId_userId_moduleId: {
                        eventId: 'event-1',
                        userId: 'user-1',
                        moduleId: 'module-1',
                    },
                },
                update: { actions: ['read', 'create', 'update'] },
                create: {
                    eventId: 'event-1',
                    userId: 'user-1',
                    moduleId: 'module-1',
                    actions: ['read', 'create', 'update'],
                },
                include: { module: true },
            });
        });

        it('should delete permission when actions array is empty', async () => {
            mockPrismaService.eventUserPermission.deleteMany.mockResolvedValue({ count: 1 });

            const result = await service.setUserModulePermission(
                'event-1',
                'user-1',
                'module-1',
                [],
            );

            expect(result).toEqual({ deleted: true });
            expect(mockPrismaService.eventUserPermission.deleteMany).toHaveBeenCalledWith({
                where: { eventId: 'event-1', userId: 'user-1', moduleId: 'module-1' },
            });
        });

        it('should throw NotFoundException when event does not exist', async () => {
            mockPrismaService.event.findUnique.mockResolvedValue(null);

            await expect(
                service.setUserModulePermission('event-1', 'user-1', 'module-1', ['read']),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException when user does not exist', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(
                service.setUserModulePermission('event-1', 'user-1', 'module-1', ['read']),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException when user belongs to different tenant', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                ...mockUser,
                tenantId: 'different-tenant',
            });

            await expect(
                service.setUserModulePermission('event-1', 'user-1', 'module-1', ['read']),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException when module does not exist', async () => {
            mockPrismaService.module.findUnique.mockResolvedValue(null);

            await expect(
                service.setUserModulePermission('event-1', 'user-1', 'module-1', ['read']),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException for invalid actions', async () => {
            await expect(
                service.setUserModulePermission('event-1', 'user-1', 'module-1', ['invalid_action']),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('listEventPermissions', () => {
        it('should return grouped permissions by user', async () => {
            mockPrismaService.eventUserPermission.findMany.mockResolvedValue([
                mockEventUserPermission,
                {
                    ...mockEventUserPermission,
                    id: 'perm-2',
                    moduleId: 'module-2',
                    actions: ['read'],
                    module: { ...mockModule, id: 'module-2', key: 'chat', name: 'Chat' },
                },
            ]);

            const result = await service.listEventPermissions('event-1');

            expect(result).toHaveLength(1);
            expect(result[0].user.id).toBe('user-1');
            expect(result[0].permissions).toEqual({
                tasks: ['read', 'create'],
                chat: ['read'],
            });
        });

        it('should return empty array when no permissions exist', async () => {
            mockPrismaService.eventUserPermission.findMany.mockResolvedValue([]);

            const result = await service.listEventPermissions('event-1');

            expect(result).toEqual([]);
        });
    });

    describe('copyUserPermissions', () => {
        it('should copy permissions from one user to another', async () => {
            mockPrismaService.eventUserPermission.findMany.mockResolvedValue([
                { ...mockEventUserPermission, module: undefined, user: undefined },
            ]);
            mockPrismaService.eventUserPermission.deleteMany.mockResolvedValue({ count: 0 });
            mockPrismaService.eventUserPermission.createMany.mockResolvedValue({ count: 1 });

            // Mock getUserEventPermissions response
            mockPrismaService.eventUserPermission.findMany
                .mockResolvedValueOnce([{ ...mockEventUserPermission, module: undefined }])
                .mockResolvedValueOnce([mockEventUserPermission]);

            const result = await service.copyUserPermissions('event-1', 'user-1', 'user-2');

            expect(mockPrismaService.eventUserPermission.deleteMany).toHaveBeenCalledWith({
                where: { eventId: 'event-1', userId: 'user-2' },
            });
            expect(mockPrismaService.eventUserPermission.createMany).toHaveBeenCalled();
        });

        it('should throw BadRequestException when source user has no permissions', async () => {
            mockPrismaService.eventUserPermission.findMany.mockResolvedValue([]);

            await expect(
                service.copyUserPermissions('event-1', 'user-1', 'user-2'),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
