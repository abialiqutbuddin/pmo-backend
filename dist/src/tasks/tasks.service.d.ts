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
    }): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        description: string | null;
        priority: number;
        startAt: Date | null;
        dueAt: Date | null;
        assigneeId: string | null;
        status: import("@prisma/client").$Enums.TaskStatus;
        progressPct: number;
        creatorId: string;
        updatedAt: Date;
    }[]>;
    create(eventId: string, departmentId: string, actor: Actor, dto: CreateTaskDto): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        priority: number;
        assigneeId: string | null;
        status: import("@prisma/client").$Enums.TaskStatus;
    }>;
    get(eventId: string, departmentId: string, taskId: string, actor: Actor): Promise<{
        id: string;
        createdAt: Date;
        departmentId: string;
        eventId: string;
        title: string;
        description: string | null;
        priority: number;
        startAt: Date | null;
        dueAt: Date | null;
        assigneeId: string | null;
        status: import("@prisma/client").$Enums.TaskStatus;
        progressPct: number;
        creatorId: string;
        updatedAt: Date;
        completedAt: Date | null;
        deletedAt: Date | null;
        sourceIssueId: string | null;
    }>;
    update(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: UpdateTaskDto): Promise<{
        id: string;
        title: string;
        priority: number;
        assigneeId: string | null;
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
                dueAt: Date | null;
                status: import("@prisma/client").$Enums.TaskStatus;
            };
        }[];
        dependents: {
            downstreamId: string;
            depType: import("@prisma/client").$Enums.DependencyType;
            task: {
                id: string;
                title: string;
                priority: number;
                dueAt: Date | null;
                status: import("@prisma/client").$Enums.TaskStatus;
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
