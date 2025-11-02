import { EventRole } from '@prisma/client';
export declare class SeedMemberDto {
    userId: string;
    role: EventRole;
}
export declare class SeedDepartmentDto {
    name: string;
    members?: SeedMemberDto[];
}
export declare class CreateEventDto {
    name: string;
    startsAt?: string;
    endsAt?: string;
    departments?: SeedDepartmentDto[];
}
