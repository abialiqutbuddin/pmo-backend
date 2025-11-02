import { EventRole } from '@prisma/client';
export declare class UpdateMemberDto {
    role: EventRole;
    departmentId?: string | null;
}
