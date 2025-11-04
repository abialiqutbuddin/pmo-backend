import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
export declare class ZonesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(eventId: string): import("@prisma/client").Prisma.PrismaPromise<{
        name: string;
        id: string;
        enabled: boolean;
    }[]>;
    create(eventId: string, dto: CreateZoneDto): Promise<{
        name: string;
        id: string;
        enabled: boolean;
    }>;
    update(eventId: string, zoneId: string, data: {
        name?: string;
        enabled?: boolean;
    }): Promise<{
        name: string;
        id: string;
        enabled: boolean;
    }>;
    setZonesEnabled(eventId: string, enabled: boolean): Promise<{
        ok: boolean;
    }>;
    listZoneDepartments(eventId: string, zoneId: string): Promise<string[]>;
    listZonalTemplates(eventId: string): Promise<{
        name: string;
        id: string;
    }[]>;
    createZonalTemplate(eventId: string, name: string): Promise<{
        name: string;
        id: string;
    }>;
    updateZonalTemplate(eventId: string, id: string, name: string): Promise<{
        name: string;
        id: string;
    }>;
    removeZonalTemplate(eventId: string, id: string): Promise<{
        ok: boolean;
    }>;
    listZoneZonalDepts(eventId: string, zoneId: string): Promise<{
        id: string;
        name: string;
        templateId: string;
    }[]>;
    setZoneDepartments(eventId: string, zoneId: string, departmentIds: string[]): Promise<{
        ok: boolean;
    }>;
    listPOCs(eventId: string, zoneId: string): Promise<{
        user: {
            email: string;
            id: string;
            fullName: string;
        };
        userId: string;
        role: string;
    }[]>;
    addPOC(eventId: string, zoneId: string, userId: string): Promise<{
        ok: boolean;
    }>;
    removePOC(eventId: string, zoneId: string, userId: string): Promise<{
        ok: boolean;
    }>;
    listZoneDeptMembers(eventId: string, zoneId: string, departmentId: string): Promise<{
        user: {
            email: string;
            id: string;
            fullName: string;
        };
        userId: string;
        role: string;
    }[]>;
    addZoneDeptMember(eventId: string, zoneId: string, departmentId: string, userId: string, role: string): Promise<{
        ok: boolean;
    }>;
    updateZoneDeptMember(eventId: string, zoneId: string, departmentId: string, userId: string, role: string): Promise<{
        ok: boolean;
    }>;
    removeZoneDeptMember(eventId: string, zoneId: string, departmentId: string, userId: string): Promise<{
        ok: boolean;
    }>;
    listAssignments(eventId: string, zoneId: string): Promise<{
        user: {
            email: string;
            id: string;
            fullName: string;
        };
        userId: string;
        role: string;
    }[]>;
    addAssignment(eventId: string, zoneId: string, userId: string, role: string): Promise<{
        ok: boolean;
    }>;
    updateAssignment(eventId: string, zoneId: string, userId: string, role: string): Promise<{
        ok: boolean;
    }>;
    removeAssignment(eventId: string, zoneId: string, userId: string): Promise<{
        ok: boolean;
    }>;
}
