import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
    console.log('--- 🚀 Seeding App Admin ---');

    // 1. Ensure System Tenant exists (or use a default one)
    // App Admin needs a tenantId because schema requires it.
    // We can create a "System" tenant.
    let tenant = await prisma.tenant.findUnique({ where: { slug: 'system' } });
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'System',
                slug: 'system',
            },
        });
        console.log('Created System Tenant:', tenant.id);
    } else {
        console.log('Found System Tenant:', tenant.id);
    }

    const email = 'admin@pmo.app';
    const password = 'password123'; // Change this in production or prompt
    const hash = await argon2.hash(password);

    // 2. Create/Update Admin User
    const user = await prisma.user.upsert({
        where: {
            email_tenantId: {
                email,
                tenantId: tenant.id,
            }
        },
        update: {
            passwordHash: hash,
            isSuperAdmin: true,
            fullName: 'App Administrator',
        },
        create: {
            email,
            tenantId: tenant.id,
            passwordHash: hash,
            fullName: 'App Administrator',
            isSuperAdmin: true,
        },
    });

    console.log(`✅ App Admin configured: ${email} (Tenant: ${tenant.slug})`);
    console.log(`Password: ${password}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
