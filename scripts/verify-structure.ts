
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- START VERIFY EVENT STRUCTURE & NESTING ---');

    // 1. Setup Tenant & Admin (Reuse or create mock)
    // Assume tenant exists or create one.
    const tenantName = 'struct-test-tenant-' + Date.now();
    const tenant = await prisma.tenant.create({
        data: {
            name: tenantName,
            slug: tenantName, // Slug is required and unique
        }
    });

    const admin = await prisma.user.create({
        data: {
            tenantId: tenant.id,
            fullName: 'Struct Admin',
            email: 'admin@' + tenantName + '.com',
            passwordHash: 'hashed',
            isSuperAdmin: false
        }
    });

    console.log(`Step 1: Tenant created: ${tenant.name}`);

    // 2. Create Event (Default ZONAL)
    const event = await prisma.event.create({
        data: {
            tenantId: tenant.id,
            name: 'Structure Test Event',
            structure: 'ZONAL'
        }
    });
    console.log(`Step 2: Event created: ${event.name} [${event.structure}]`);

    // 3. Update to HIERARCHICAL
    const updated = await prisma.event.update({
        where: { id: event.id },
        data: { structure: 'HIERARCHICAL' }
    });
    if (updated.structure !== 'HIERARCHICAL') throw new Error('Failed to update structure');
    console.log(`Step 3: Event updated to HIERARCHICAL`);

    // 4. Create Parent Department
    const parent = await prisma.department.create({
        data: {
            eventId: event.id,
            name: 'Root Dept'
        }
    });
    console.log(`Step 4: Parent Dept created: ${parent.name}`);

    // 5. Create Child Department
    const child = await prisma.department.create({
        data: {
            eventId: event.id,
            name: 'Sub Dept',
            parentId: parent.id
        }
    });
    if (child.parentId !== parent.id) throw new Error('Parent ID not saved');
    console.log(`Step 5: Child Dept created: ${child.name} (Parent: ${child.parentId})`);

    // 6. Verify Fetch
    const fetched = await prisma.department.findMany({
        where: { eventId: event.id },
        orderBy: { name: 'asc' }
    });
    console.log(`Step 6: Departments fetched:`, fetched.map(d => `${d.name} (p:${d.parentId})`));

    if (fetched.length !== 2) throw new Error('Expected 2 departments');

    console.log('--- ALL CHECKS PASSED ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
