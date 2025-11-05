import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
export declare class EventsController {
    private readonly events;
    constructor(events: EventsService);
    createEvent(user: any, dto: CreateEventDto): Promise<{
        id: string;
        name: string;
        startsAt: Date | null;
        endsAt: Date | null;
        createdAt: Date;
    }>;
    listEvents(user: any): Promise<{
        id: string;
        name: string;
        startsAt: Date | null;
        endsAt: Date | null;
        createdAt: Date;
        archivedAt: Date | null;
    }[]>;
    getEvent(eventId: string, user: any): Promise<{
        id: string;
        name: string;
        startsAt: Date | null;
        endsAt: Date | null;
        createdAt: Date;
        archivedAt: Date | null;
        zonesEnabled: boolean;
    }>;
    updateEvent(eventId: string, dto: UpdateEventDto, user: any): Promise<{
        id: string;
        name: string;
        startsAt: Date | null;
        endsAt: Date | null;
        createdAt: Date;
        archivedAt: Date | null;
    }>;
    deleteEvent(eventId: string, user: any): Promise<{
        ok: boolean;
    }>;
    listMembers(eventId: string, user: any): Promise<{
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
    addMember(eventId: string, dto: AddMemberDto, user: any): Promise<{
        id: string;
        eventId: string;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
    }>;
    updateMember(eventId: string, userId: string, dto: UpdateMemberDto, user: any): Promise<{
        id: string;
        eventId: string;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
    }>;
    removeMember(eventId: string, userId: string, user: any): Promise<{
        ok: boolean;
    }>;
}
