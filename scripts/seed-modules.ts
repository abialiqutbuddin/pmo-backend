
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MODULES = [
    {
        key: 'events',
        name: 'Events',
        description: 'Manage event settings, create events, and view dashboard.',
        features: ['read', 'create', 'update', 'delete', 'manage_settings']
    },
    {
        key: 'tasks',
        name: 'Tasks',
        description: 'Task management including creation, assignment, and updates.',
        features: ['read', 'create', 'update', 'delete', 'assign']
    },
    {
        key: 'chat',
        name: 'Chat',
        description: 'Instant messaging and channels.',
        features: ['read', 'send_message', 'delete_message']
    },
    {
        key: 'departments',
        name: 'Departments',
        description: 'Manage department hierarchy and members.',
        features: ['read', 'create', 'update', 'delete', 'manage_members']
    },
    {
        key: 'zones',
        name: 'Zones',
        description: 'Manage zones and zone assignments.',
        features: ['read', 'create', 'update', 'delete', 'manage_assignments']
    },
    {
        key: 'users',
        name: 'Users',
        description: 'Manage tenant users.',
        features: ['read', 'create', 'update', 'delete', 'invite']
    },
    {
        key: 'roles',
        name: 'Roles & Permissions',
        description: 'Manage roles and access control.',
        features: ['read', 'create', 'update', 'delete']
    },
    {
        key: 'gantt',
        name: 'Gantt',
        description: 'View Gantt charts.',
        features: ['read']
    },
    {
        key: 'feedback',
        name: 'Feedback',
        description: 'View and manage feedback.',
        features: ['read', 'create', 'delete']
    }
];

async function main() {
    console.log('Seeding Modules...');

    for (const m of MODULES) {
        await prisma.module.upsert({
            where: { key: m.key },
            update: {
                name: m.name,
                description: m.description,
                features: m.features
            },
            create: {
                key: m.key,
                name: m.name,
                description: m.description,
                features: m.features
            }
        });
        console.log(`Upserted module: ${m.key}`);
    }

    console.log('Done.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
