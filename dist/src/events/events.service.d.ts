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
        name: string;
        id: string;
        createdAt: Date;
        startsAt: Date | null;
        endsAt: Date | null;
    }>;
    get(eventId: string, viewer: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        startsAt: Date | null;
        endsAt: Date | null;
        archivedAt: Date | null;
    }>;
    listForUser(viewer: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        startsAt: Date | null;
        endsAt: Date | null;
        archivedAt: Date | null;
    }[]>;
    update(eventId: string, dto: UpdateEventDto, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        startsAt: Date | null;
        endsAt: Date | null;
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
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
        eventId: string;
    }>;
    updateMember(eventId: string, userId: string, dto: UpdateMemberDto, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
        eventId: string;
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
            email: string;
            id: string;
            fullName: string;
            itsId: string | null;
            profileImage: string | null;
            designation: string | null;
        };
        id: string;
        createdAt: Date;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
    }[]>;
}
