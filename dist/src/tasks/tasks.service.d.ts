import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { AddDependencyDto } from './dto/dependencies/add-dependency.dto';
import { RemoveDependencyDto } from './dto/dependencies/remove-dependency.dto';
type Actor = {
    userId: string;
    isSuperAdmin: boolean;
};
export declare class TasksService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private getActorRole;
    list(eventId: string, departmentId: string, actor: Actor, opts?: {
        cursor?: string;
        take?: number;
        assigneeId?: string;
        zoneId?: string;
        zonalDeptRowId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        creatorId: string;
        assigneeId: string | null;
        venueId: string | null;
        zoneId: string | null;
        zonalDeptRowId: string | null;
        type: import("@prisma/client").$Enums.TaskType;
        title: string;
        description: string | null;
        priority: number;
        status: import("@prisma/client").$Enums.TaskStatus;
        progressPct: number;
        startAt: Date | null;
        dueAt: Date | null;
        updatedAt: Date;
    }[]>;
    create(eventId: string, departmentId: string, actor: Actor, dto: CreateTaskDto): Promise<{
        id: string;
        createdAt: Date;
        assigneeId: string | null;
        title: string;
        priority: number;
        status: import("@prisma/client").$Enums.TaskStatus;
    }>;
    get(eventId: string, departmentId: string, taskId: string, actor: Actor): Promise<{
        id: string;
        createdAt: Date;
        departmentId: string;
        eventId: string;
        creatorId: string;
        assigneeId: string | null;
        venueId: string | null;
        zoneId: string | null;
        zonalDeptRowId: string | null;
        type: import("@prisma/client").$Enums.TaskType;
        title: string;
        description: string | null;
        priority: number;
        status: import("@prisma/client").$Enums.TaskStatus;
        progressPct: number;
        startAt: Date | null;
        dueAt: Date | null;
        updatedAt: Date;
        completedAt: Date | null;
        deletedAt: Date | null;
    }>;
    update(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: UpdateTaskDto): Promise<{
        id: string;
        assigneeId: string | null;
        title: string;
        priority: number;
        status: import("@prisma/client").$Enums.TaskStatus;
        updatedAt: Date;
    }>;
    changeStatus(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: ChangeTaskStatusDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.TaskStatus;
        progressPct: number;
        updatedAt: Date;
        completedAt: Date | null;
    }>;
    remove(eventId: string, departmentId: string, taskId: string, actor: Actor): Promise<{
        ok: boolean;
    }>;
    listDependencies(eventId: string, departmentId: string, taskId: string, actor: Actor): Promise<{
        blockers: {
            upstreamId: string;
            depType: import("@prisma/client").$Enums.DependencyType;
            task: {
                id: string;
                title: string;
                priority: number;
                status: import("@prisma/client").$Enums.TaskStatus;
                dueAt: Date | null;
            };
        }[];
        dependents: {
            downstreamId: string;
            depType: import("@prisma/client").$Enums.DependencyType;
            task: {
                id: string;
                title: string;
                priority: number;
                status: import("@prisma/client").$Enums.TaskStatus;
                dueAt: Date | null;
            };
        }[];
    }>;
    addDependency(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: AddDependencyDto): Promise<{
        ok: boolean;
    }>;
    removeDependency(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: RemoveDependencyDto): Promise<{
        ok: boolean;
    }>;
}
export {};
