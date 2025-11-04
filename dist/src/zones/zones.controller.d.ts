import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
export declare class ZonesController {
    private readonly zones;
    constructor(zones: ZonesService);
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
    update(eventId: string, zoneId: string, body: {
        name?: string;
        enabled?: boolean;
    }): Promise<{
        name: string;
        id: string;
        enabled: boolean;
    }>;
    toggle(eventId: string, enabled: string): Promise<{
        ok: boolean;
    }>;
    listZoneDepartments(eventId: string, zoneId: string): Promise<string[]>;
    setZoneDepartments(eventId: string, zoneId: string, body: {
        departmentIds: string[];
    }): Promise<{
        ok: boolean;
    }>;
    listZonalTemplates(eventId: string): Promise<{
        name: string;
        id: string;
    }[]>;
    createZonalTemplate(eventId: string, body: {
        name: string;
    }): Promise<{
        name: string;
        id: string;
    }>;
    updateZonalTemplate(eventId: string, zdeptId: string, body: {
        name: string;
    }): Promise<{
        name: string;
        id: string;
    }>;
    removeZonalTemplate(eventId: string, zdeptId: string): Promise<{
        ok: boolean;
    }>;
    listZoneZonalDepts(eventId: string, zoneId: string): Promise<{
        id: string;
        name: string;
        templateId: string;
    }[]>;
    listPOCs(eventId: string, zoneId: string): Promise<{
        user: {
            email: string;
            id: string;
            fullName: string;
        };
        userId: string;
        role: string;
    }[]>;
    addPOC(eventId: string, zoneId: string, body: {
        userId: string;
    }): Promise<{
        ok: boolean;
    }>;
    removePOC(eventId: string, zoneId: string, userId: string): Promise<{
        ok: boolean;
    }>;
    listZoneDeptMembers(eventId: string, zoneId: string, deptId: string): Promise<{
        user: {
            email: string;
            id: string;
            fullName: string;
        };
        userId: string;
        role: string;
    }[]>;
    addZoneDeptMember(eventId: string, zoneId: string, deptId: string, body: {
        userId: string;
        role: string;
    }): Promise<{
        ok: boolean;
    }>;
    updateZoneDeptMember(eventId: string, zoneId: string, deptId: string, userId: string, body: {
        role: string;
    }): Promise<{
        ok: boolean;
    }>;
    removeZoneDeptMember(eventId: string, zoneId: string, deptId: string, userId: string): Promise<{
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
    addAssignment(eventId: string, zoneId: string, body: {
        userId: string;
        role: string;
    }): Promise<{
        ok: boolean;
    }>;
    updateAssignment(eventId: string, zoneId: string, userId: string, body: {
        role: string;
    }): Promise<{
        ok: boolean;
    }>;
    removeAssignment(eventId: string, zoneId: string, userId: string): Promise<{
        ok: boolean;
    }>;
}
