import { EventRole } from '@prisma/client';
export declare class AddMemberDto {
    userId: string;
    role: EventRole;
    departmentId?: string;
}
