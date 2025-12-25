import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const events = await prisma.event.findMany();
    console.log(`Found ${events.length} events.`);

    const eventsModule = await prisma.module.findFirst({ where: { key: 'events' } });
    if (!eventsModule) {
        console.error('Events module not found! Please run seed first.');
        return;
    }

    for (const event of events) {
        // Find the first member (creator)
        const firstMember = await prisma.eventMembership.findFirst({
            where: { eventId: event.id },
            orderBy: { createdAt: 'asc' }
        });

        if (!firstMember) {
            console.log(`Event ${event.name} has no members.`);
            continue;
        }

        console.log(`Granting administrative permissions to creator (userId: ${firstMember.userId}) for event '${event.name}'...`);

        // Upsert permissions
        const actions = ['manage_settings', 'update', 'read', 'assign_members'];

        // Check existing
        const existing = await prisma.eventUserPermission.findUnique({
            where: {
                eventId_userId_moduleId: {
                    eventId: event.id,
                    userId: firstMember.userId,
                    moduleId: eventsModule.id
                }
            }
        });

        if (existing) {
            // Merge actions
            const currentActions = (existing.actions as string[]) || [];
            const newActions = Array.from(new Set([...currentActions, ...actions]));
            await prisma.eventUserPermission.update({
                where: { id: existing.id },
                data: { actions: newActions }
            });
            console.log(`Updated permissions for user ${firstMember.userId}`);
        } else {
            await prisma.eventUserPermission.create({
                data: {
                    eventId: event.id,
                    userId: firstMember.userId,
                    moduleId: eventsModule.id,
                    actions: actions
                }
            });
            console.log(`Created permissions for user ${firstMember.userId}`);
        }
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
