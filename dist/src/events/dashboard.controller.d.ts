import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private scopeDepts;
    summary(eventId: string, user: any): Promise<{
        total: number;
        completed: number;
        overdue: number;
        inProgress: number;
        avgProgressPct: number;
        byStatus?: undefined;
    } | {
        total: number;
        completed: number;
        inProgress: number;
        overdue: number;
        avgProgressPct: number;
        byStatus: {
            todo: number;
            in_progress: number;
            blocked: number;
            done: number;
            canceled: number;
        };
    }>;
    dueSoon(eventId: string, user: any, days?: string): Promise<{
        id: string;
        title: string;
        status: import("@prisma/client").$Enums.TaskStatus;
        dueAt: Date | null;
        priority: number;
        departmentId: string;
        departmentName: string;
        assigneeId: string | null;
        assigneeName: string | null;
    }[]>;
    recent(eventId: string, user: any): Promise<{
        id: string;
        title: string;
        status: import("@prisma/client").$Enums.TaskStatus;
        updatedAt: Date;
        progressPct: number;
        departmentName: string;
        assigneeName: string | null;
    }[]>;
    deptOverview(eventId: string, user: any): Promise<{
        departmentId: string;
        name: string;
        total: number;
        done: number;
        avgProgressPct: number;
    }[]>;
    myTasks(eventId: string, user: any): Promise<{
        id: string;
        title: string;
        status: import("@prisma/client").$Enums.TaskStatus;
        dueAt: Date | null;
        progressPct: number;
        priority: number;
        departmentName: string;
    }[]>;
}
