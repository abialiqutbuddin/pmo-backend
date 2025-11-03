import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
export declare class EventsController {
    private readonly events;
    constructor(events: EventsService);
    createEvent(user: any, dto: CreateEventDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        startsAt: Date | null;
        endsAt: Date | null;
    }>;
    listEvents(user: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        startsAt: Date | null;
        endsAt: Date | null;
        archivedAt: Date | null;
    }[]>;
    getEvent(eventId: string, user: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        startsAt: Date | null;
        endsAt: Date | null;
        archivedAt: Date | null;
    }>;
    updateEvent(eventId: string, dto: UpdateEventDto, user: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        startsAt: Date | null;
        endsAt: Date | null;
        archivedAt: Date | null;
    }>;
    deleteEvent(eventId: string, user: any): Promise<{
        ok: boolean;
    }>;
    listMembers(eventId: string, user: any): Promise<{
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
    addMember(eventId: string, dto: AddMemberDto, user: any): Promise<{
        id: string;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
        eventId: string;
    }>;
    updateMember(eventId: string, userId: string, dto: UpdateMemberDto, user: any): Promise<{
        id: string;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
        eventId: string;
    }>;
    removeMember(eventId: string, userId: string, user: any): Promise<{
        ok: boolean;
    }>;
}
