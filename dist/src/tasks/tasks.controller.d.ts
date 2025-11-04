import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { AddDependencyDto } from './dto/dependencies/add-dependency.dto';
import { RemoveDependencyDto } from './dto/dependencies/remove-dependency.dto';
export declare class TasksController {
    private readonly tasks;
    constructor(tasks: TasksService);
    list(eventId: string, departmentId: string, user: any, cursor?: string, take?: string, assigneeId?: string, zoneId?: string, zonalDeptRowId?: string): Promise<{
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
    create(eventId: string, departmentId: string, user: any, dto: CreateTaskDto): Promise<{
        id: string;
        createdAt: Date;
        assigneeId: string | null;
        title: string;
        priority: number;
        status: import("@prisma/client").$Enums.TaskStatus;
    }>;
    get(eventId: string, departmentId: string, taskId: string, user: any): Promise<{
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
    update(eventId: string, departmentId: string, taskId: string, user: any, dto: UpdateTaskDto): Promise<{
        id: string;
        assigneeId: string | null;
        title: string;
        priority: number;
        status: import("@prisma/client").$Enums.TaskStatus;
        updatedAt: Date;
    }>;
    changeStatus(eventId: string, departmentId: string, taskId: string, user: any, dto: ChangeTaskStatusDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.TaskStatus;
        progressPct: number;
        updatedAt: Date;
        completedAt: Date | null;
    }>;
    remove(eventId: string, departmentId: string, taskId: string, user: any): Promise<{
        ok: boolean;
    }>;
    deps(eventId: string, departmentId: string, taskId: string, user: any): Promise<{
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
    addDep(eventId: string, departmentId: string, taskId: string, user: any, dto: AddDependencyDto): Promise<{
        ok: boolean;
    }>;
    removeDep(eventId: string, departmentId: string, taskId: string, user: any, dto: RemoveDependencyDto): Promise<{
        ok: boolean;
    }>;
}
