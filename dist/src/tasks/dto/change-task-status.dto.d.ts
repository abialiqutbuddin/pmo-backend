import { TaskStatus } from '@prisma/client';
export declare class ChangeTaskStatusDto {
    status: TaskStatus;
    progressPct?: number;
}
