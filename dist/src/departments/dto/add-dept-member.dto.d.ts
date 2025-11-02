import { EventRole } from '@prisma/client';
export declare class AddDeptMemberDto {
    userId: string;
    role: EventRole;
    note?: string;
}
