import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
export declare class EventsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private static readonly ADMIN_ROLES;
    private static readonly DEPT_SCOPED;
    private static readonly EVENT_SCOPED;
    create(dto: CreateEventDto, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        name: string;
        startsAt: Date | null;
        endsAt: Date | null;
        createdAt: Date;
    }>;
    get(eventId: string, viewer: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        name: string;
        startsAt: Date | null;
        endsAt: Date | null;
        createdAt: Date;
        archivedAt: Date | null;
        zonesEnabled: boolean;
    }>;
    listForUser(viewer: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        name: string;
        startsAt: Date | null;
        endsAt: Date | null;
        createdAt: Date;
        archivedAt: Date | null;
    }[]>;
    update(eventId: string, dto: UpdateEventDto, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        name: string;
        startsAt: Date | null;
        endsAt: Date | null;
        createdAt: Date;
        archivedAt: Date | null;
    }>;
    remove(eventId: string, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        ok: boolean;
    }>;
    addMember(eventId: string, dto: AddMemberDto, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        eventId: string;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
    }>;
    updateMember(eventId: string, userId: string, dto: UpdateMemberDto, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        eventId: string;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
    }>;
    removeMember(eventId: string, userId: string, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        ok: boolean;
    }>;
    listMembers(eventId: string, viewer: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        user: {
            id: string;
            email: string;
            fullName: string;
            itsId: string | null;
            profileImage: string | null;
            designation: string | null;
        };
        createdAt: Date;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
    }[]>;
}
