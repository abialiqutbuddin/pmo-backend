import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard';

describe('Task Dependencies & Search (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let eventId: string;
    let deptAId: string;
    let deptBId: string;
    let userId: string;
    let tenantId: string;

    // Mock Guard to bypass Auth for these logic tests
    const mockAuthGuard = {
        canActivate: (context) => {
            const req = context.switchToHttp().getRequest();
            req.user = { sub: userId, isSuperAdmin: true, isTenantManager: true };
            return true;
        },
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(mockAuthGuard)
            .compile();

        app = moduleFixture.createNestApplication();
        prisma = app.get(PrismaService);
        await app.init();

        // Setup Data
        const uniqueSlug = `test-tenant-${Date.now()}`;
        const user = await prisma.user.create({
            data: {
                email: `test-${Date.now()}@e2e.com`,
                fullName: 'Test Dep User',
                passwordHash: 'placeholder',
                tenant: {
                    create: {
                        name: 'Test Tenant Depend',
                        slug: uniqueSlug
                    }
                }
            }
        });
        userId = user.id;
        tenantId = user.tenantId;

        const role = await prisma.role.create({
            data: {
                name: 'Test Manager',
                tenantId: tenantId,
                isSystem: false
            }
        });

        const event = await prisma.event.create({
            data: {
                name: 'Dependency Test Event',
                tenantId: tenantId
            }
        });
        eventId = event.id;

        const dA = await prisma.department.create({ data: { name: 'Dept A', eventId } });
        const dB = await prisma.department.create({ data: { name: 'Dept B', eventId } });
        deptAId = dA.id;
        deptBId = dB.id;

        await prisma.eventMembership.create({ data: { eventId, userId, roleId: role.id } });
    });

    afterAll(async () => {
        try {
            if (eventId) {
                await prisma.taskDependency.deleteMany({ where: { blocked: { eventId } } });
                await prisma.task.deleteMany({ where: { eventId } });
                await prisma.department.deleteMany({ where: { eventId } });
                await prisma.event.delete({ where: { id: eventId } });
            }
        } catch (e) { }

        try {
            if (userId) {
                await prisma.user.delete({ where: { id: userId } });
                await prisma.role.deleteMany({ where: { tenantId } });
                await prisma.tenant.delete({ where: { id: tenantId } });
            }
        } catch (e) { }
        await app.close();
    });

    let taskAId: string;
    let taskBId: string;

    it('Should create two tasks in different departments', async () => {
        const resA = await request(app.getHttpServer())
            .post(`/events/${eventId}/departments/${deptAId}/tasks`)
            .set('X-Tenant-ID', tenantId)
            .send({ title: 'Task A (Blocker)', priority: 3, type: 'new_task' });

        if (resA.status !== 201) console.error('CreateTask A Error:', JSON.stringify(resA.body, null, 2));
        expect(resA.status).toBe(201);
        taskAId = resA.body.id;

        const resB = await request(app.getHttpServer())
            .post(`/events/${eventId}/departments/${deptBId}/tasks`)
            .set('X-Tenant-ID', tenantId)
            .send({ title: 'Task B (Blocked)', priority: 3, type: 'new_task' });

        if (resB.status !== 201) console.error('CreateTask B Error:', JSON.stringify(resB.body, null, 2));
        expect(resB.status).toBe(201);
        taskBId = resB.body.id;
    });

    it('Should search tasks successfully (Scoped)', async () => {
        const res = await request(app.getHttpServer())
            .get(`/events/${eventId}/departments/${deptBId}/tasks/search?q=Blocker`)
            .set('X-Tenant-ID', tenantId)
            .expect(200);

        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].title).toContain('Task A');
        expect(res.body[0].id).toBe(taskAId);
    });

    it('Should FAIL to link self-dependency', async () => {
        await request(app.getHttpServer())
            .post(`/events/${eventId}/departments/${deptBId}/tasks/${taskBId}/dependencies`)
            .set('X-Tenant-ID', tenantId)
            .send({ blockerId: taskBId })
            .expect(400);
    });

    it('Should link Task A as blocker for Task B', async () => {
        const res = await request(app.getHttpServer())
            .post(`/events/${eventId}/departments/${deptBId}/tasks/${taskBId}/dependencies`)
            .set('X-Tenant-ID', tenantId)
            .send({ blockerId: taskAId });

        if (res.status !== 201) console.error('Link Failure:', JSON.stringify(res.body, null, 2));
        expect(res.status).toBe(201);

        const getRes = await request(app.getHttpServer())
            .get(`/events/${eventId}/departments/${deptBId}/tasks/${taskBId}/dependencies`)
            .set('X-Tenant-ID', tenantId)
            .expect(200);

        expect(getRes.body.blockers).toHaveLength(1);
        expect(getRes.body.blockers[0].blockerId).toBe(taskAId);
    });

    it('Should PREVENT completing Task B (Blocked)', async () => {
        const res = await request(app.getHttpServer())
            .patch(`/events/${eventId}/departments/${deptBId}/tasks/${taskBId}/status`)
            .set('X-Tenant-ID', tenantId)
            .send({ status: 'done' });

        if (res.status !== 403) console.error('Blocking Failure:', JSON.stringify(res.body, null, 2));
        expect(res.status).toBe(403);
    });

    it('Should ALLOW completing Task B after Task A is done', async () => {
        await request(app.getHttpServer())
            .patch(`/events/${eventId}/departments/${deptAId}/tasks/${taskAId}/status`)
            .set('X-Tenant-ID', tenantId)
            .send({ status: 'done' })
            .expect(200);

        await request(app.getHttpServer())
            .patch(`/events/${eventId}/departments/${deptBId}/tasks/${taskBId}/status`)
            .set('X-Tenant-ID', tenantId)
            .send({ status: 'done' })
            .expect(200);
    });

    it('Should remove dependency', async () => {
        await request(app.getHttpServer())
            .delete(`/events/${eventId}/departments/${deptBId}/tasks/${taskBId}/dependencies`)
            .set('X-Tenant-ID', tenantId)
            .send({ blockerId: taskAId })
            .expect(200);

        const res = await request(app.getHttpServer())
            .get(`/events/${eventId}/departments/${deptBId}/tasks/${taskBId}/dependencies`)
            .set('X-Tenant-ID', tenantId)
            .expect(200);

        expect(res.body.blockers).toHaveLength(0);
    });
});
