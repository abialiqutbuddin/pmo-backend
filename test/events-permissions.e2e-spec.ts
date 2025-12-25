import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TasksService } from '../src/tasks/tasks.service';
import { EventsService } from '../src/events/events.service';
import { MailerService } from '../src/mail/mailer.service';
import { EventRoleScope } from '@prisma/client';

describe('Event Permissions (E2E)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let tasksService: TasksService;
    let eventsService: EventsService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [
                TasksService,
                EventsService,
                PrismaService,
                {
                    provide: MailerService,
                    useValue: { sendTaskAssignedEmail: jest.fn() }
                }
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get(PrismaService);
        tasksService = app.get(TasksService);
        eventsService = app.get(EventsService);
    });

    afterAll(async () => {
        await app.close();
    });

    // Test Data State
    let tenantId: string;
    let eventId: string;
    let deptParentId: string;
    let deptChildId: string;
    let deptSiblingId: string;

    let userAdminId: string;
    let userParentId: string;
    let userChildId: string;
    let userSiblingId: string;
    let userMultiId: string; // Member of Child + Sibling

    beforeEach(async () => {
        // 1. Setup Tenant
        const tenant = await prisma.tenant.create({ data: { name: 'Test Tenant', slug: `test-${Date.now()}` } });
        tenantId = tenant.id;

        // 2. Setup Users
        const createUser = async (name: string) => (await prisma.user.create({
            data: { tenantId, email: `${name.toLowerCase().replace(' ', '')}@test.com`, fullName: name, passwordHash: 'hash' }
        })).id;

        userAdminId = await createUser('Global Admin');
        userParentId = await createUser('Parent Member');
        userChildId = await createUser('Child Member');
        userSiblingId = await createUser('Sibling Member');
        userMultiId = await createUser('Multi Member');

        // 3. Setup Event
        const event = await prisma.event.create({
            data: { tenantId, name: 'Perm Test Event', startsAt: new Date(), endsAt: new Date() }
        });
        eventId = event.id;

        // 4. Setup Departments (Parent -> Child, Sibling)
        const deptParent = await prisma.department.create({ data: { eventId, name: 'Parent Dept' } });
        deptParentId = deptParent.id;

        const deptChild = await prisma.department.create({ data: { eventId, name: 'Child Dept', parentId: deptParentId } });
        deptChildId = deptChild.id;

        const deptSibling = await prisma.department.create({ data: { eventId, name: 'Sibling Dept' } });
        deptSiblingId = deptSibling.id;

        // 5. Setup Roles
        const roleGlobalAdmin = await prisma.role.create({
            data: { tenantId, name: 'Global Admin Role', isSystem: false, scope: EventRoleScope.EVENT }
        });

        // Upsert Modules
        const modEvents = await prisma.module.upsert({
            where: { key: 'events' },
            update: {},
            create: { key: 'events', name: 'Events' }
        });
        const modTasks = await prisma.module.upsert({
            where: { key: 'tasks' },
            update: {},
            create: { key: 'tasks', name: 'Tasks' }
        });

        await prisma.permission.create({
            data: { roleId: roleGlobalAdmin.id, moduleId: modTasks.id, actions: ['view_all', 'read'] }
        });


        const roleMember = await prisma.role.create({
            data: { tenantId, name: 'Dept Member Role', isSystem: false, scope: EventRoleScope.DEPARTMENT }
        });
        await prisma.permission.create({
            data: { roleId: roleMember.id, moduleId: modTasks.id, actions: ['read', 'create'] }
        });
        // 6. Assign Memberships
        // Admin -> Global
        await prisma.eventMembership.create({
            data: { eventId, userId: userAdminId, roleId: roleGlobalAdmin.id, departmentId: null }
        });

        // Parent Member -> Parent Dept
        await prisma.eventMembership.create({
            data: { eventId, userId: userParentId, roleId: roleMember.id, departmentId: deptParentId }
        });

        // Child Member -> Child Dept
        await prisma.eventMembership.create({
            data: { eventId, userId: userChildId, roleId: roleMember.id, departmentId: deptChildId }
        });

        // Sibling Member -> Sibling Dept
        await prisma.eventMembership.create({
            data: { eventId, userId: userSiblingId, roleId: roleMember.id, departmentId: deptSiblingId }
        });

        // Multi Member -> Child + Sibling
        await prisma.eventMembership.create({
            data: { eventId, userId: userMultiId, roleId: roleMember.id, departmentId: deptChildId }
        });
        await prisma.eventMembership.create({
            data: { eventId, userId: userMultiId, roleId: roleMember.id, departmentId: deptSiblingId }
        });
    });

    afterEach(async () => {
        // Clean up (Order Matters for FKs)
        await prisma.eventMembership.deleteMany({ where: { eventId } });
        try { await prisma.eventUserPermission.deleteMany({ where: { eventId } }); } catch { } // Cleanup event permissions
        await prisma.taskDependency.deleteMany({ where: { downstream: { eventId } } }); // cleanup deps if any
        await prisma.task.deleteMany({ where: { eventId } });
        await prisma.department.deleteMany({ where: { eventId } });
        await prisma.event.delete({ where: { id: eventId } });

        await prisma.user.deleteMany({ where: { tenantId } });
        await prisma.permission.deleteMany({ where: { role: { tenantId } } }); // cleanup perms
        await prisma.role.deleteMany({ where: { tenantId } });


        await prisma.tenant.delete({ where: { id: tenantId } });
        // await prisma.module.deleteMany({}); // Keep modules for simplicity or cleanup in global teardown
    });

    describe('Tasks Visibility', () => {
        let taskParent: any, taskChild: any, taskSibling: any;

        beforeEach(async () => {
            // Create Tasks
            taskParent = await prisma.task.create({
                data: { eventId, departmentId: deptParentId, title: 'Parent Task', creatorId: userAdminId }
            });
            taskChild = await prisma.task.create({
                data: { eventId, departmentId: deptChildId, title: 'Child Task', creatorId: userAdminId }
            });
            taskSibling = await prisma.task.create({
                data: { eventId, departmentId: deptSiblingId, title: 'Sibling Task', creatorId: userAdminId }
            });
        });

        it('Global Admin should see ALL tasks', async () => {
            const res = await tasksService.list(eventId, undefined, { userId: userAdminId, isSuperAdmin: false });
            expect(res.length).toBe(3);
            expect(res.map(t => t.id).sort()).toEqual([taskParent.id, taskChild.id, taskSibling.id].sort());
        });

        it('Parent Member should see Parent + Child tasks (Hierarchy)', async () => {
            const res = await tasksService.list(eventId, undefined, { userId: userParentId, isSuperAdmin: false });
            // Should see Parent and Child. NOT Sibling.
            expect(res.length).toBe(2);
            expect(res.map(t => t.id).sort()).toEqual([taskParent.id, taskChild.id].sort());
        });

        it('Child Member should ONLY see Child tasks', async () => {
            // Initially standard member sees only their dept
            const res = await tasksService.list(eventId, undefined, { userId: userChildId, isSuperAdmin: false });
            expect(res.length).toBe(1);
            expect(res[0].id).toBe(taskChild.id);
        });

        it('Multi Member should see Child + Sibling tasks', async () => {
            const res = await tasksService.list(eventId, undefined, { userId: userMultiId, isSuperAdmin: false });
            expect(res.length).toBe(2);
            expect(res.map(t => t.id).sort()).toEqual([taskChild.id, taskSibling.id].sort());

            // Debug if fails
            if (res.length !== 2) console.log('Multi Member sees:', res.map(t => t.title));
        });

        it('Specific Department Filter: Parent Member accessing Child Dept -> OK', async () => {
            const res = await tasksService.list(eventId, deptChildId, { userId: userParentId, isSuperAdmin: false });
            expect(res.length).toBe(1);
            expect(res[0].id).toBe(taskChild.id);
        });

        it('Specific Department Filter: Child Member accessing Parent Dept -> Empty (Forbidden)', async () => {
            const res = await tasksService.list(eventId, deptParentId, { userId: userChildId, isSuperAdmin: false });
            expect(res.length).toBe(0);
        });
    });

});
