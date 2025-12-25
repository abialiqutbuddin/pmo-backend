import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:4000';

async function main() {
    console.log('--- 🚀 Starting Robust API Verification (RBAC) ---');
    console.log('Target API:', API_URL);

    const suffix = Date.now();
    // 1. Setup Tenant
    const tenant = await prisma.tenant.create({ data: { name: 'RBAC Test Tenant', slug: `rbac-test-${suffix}` } });
    console.log('Tenant Created:', tenant.id);

    // 2. Setup Users
    const password = 'password123';
    const passwordHash = await argon2.hash(password);

    const adminUser = await prisma.user.create({
        data: { email: `admin-${suffix}@test.com`, fullName: 'Admin User', passwordHash, tenantId: tenant.id }
    });
    const viewerUser = await prisma.user.create({
        data: { email: `viewer-${suffix}@test.com`, fullName: 'Viewer User', passwordHash, tenantId: tenant.id }
    });

    const event = await prisma.event.create({ data: { name: 'RBAC Event', tenantId: tenant.id } });

    // 3. Setup Permissions
    let modEvents = await prisma.module.findUnique({ where: { key: 'events' } });
    if (!modEvents) modEvents = await prisma.module.create({ data: { key: 'events', name: 'Events', features: ['read', 'manage'] } });

    const roleManager = await prisma.role.create({ data: { name: 'Manager', tenantId: tenant.id } });
    const roleViewer = await prisma.role.create({ data: { name: 'Viewer', tenantId: tenant.id } });

    await prisma.permission.create({ data: { roleId: roleManager.id, moduleId: modEvents!.id, actions: ['read', 'manage'] } });
    await prisma.permission.create({ data: { roleId: roleViewer.id, moduleId: modEvents!.id, actions: ['read'] } });

    await prisma.eventMembership.create({ data: { eventId: event.id, userId: adminUser.id, roleId: roleManager.id } });
    await prisma.eventMembership.create({ data: { eventId: event.id, userId: viewerUser.id, roleId: roleViewer.id } });

    console.log('Users & RBAC Setup Complete.');

    // Common Config
    const baseConfig = { headers: { 'X-Tenant-ID': tenant.id } };

    try {
        // 4. Login
        console.log('Login Admin...');
        const loginAdmin = await axios.post(`${API_URL}/auth/login`, { email: adminUser.email, password }, baseConfig);
        const tokenAdmin = loginAdmin.data.accessToken;
        console.log('✅ Admin Logged In');

        console.log('Login Viewer...');
        const loginViewer = await axios.post(`${API_URL}/auth/login`, { email: viewerUser.email, password }, baseConfig);
        const tokenViewer = loginViewer.data.accessToken;
        console.log('✅ Viewer Logged In');

        // Headers with Auth
        const authAdmin = { headers: { ...baseConfig.headers, Authorization: `Bearer ${tokenAdmin}` } };
        const authViewer = { headers: { ...baseConfig.headers, Authorization: `Bearer ${tokenViewer}` } };

        // 5. Protected Actions
        console.log('Test: Admin Create Department...');
        await axios.post(`${API_URL}/events/${event.id}/departments`, { name: 'Engineering' }, authAdmin);
        console.log('✅ Admin Created Department (201)');

        console.log('Test: Viewer Create Department (Expect 403)...');
        try {
            await axios.post(`${API_URL}/events/${event.id}/departments`, { name: 'Marketing' }, authViewer);
            throw new Error('❌ Viewer WAS able to create department! RBAC Fail.');
        } catch (e: any) {
            if (e.response && e.response.status === 403) {
                console.log('✅ Viewer blocked (403 Forbidden) as expected.');
            } else {
                throw new Error(`❌ Unexpected error: ${e.message} status: ${e.response?.status}`);
            }
        }

        console.log('Test: Viewer Read Dashboard...');
        await axios.get(`${API_URL}/events/${event.id}/dashboard/summary`, authViewer);
        console.log('✅ Viewer Read Dashboard (200 OK)');

        console.log('--- 🏁 Verification Passed! ---');
    } catch (err: any) {
        console.error('Test Failed:', err.message, err.response?.data);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
