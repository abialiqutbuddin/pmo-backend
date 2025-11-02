import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { AddDependencyDto } from './dto/dependencies/add-dependency.dto';
import { RemoveDependencyDto } from './dto/dependencies/remove-dependency.dto';
export declare class TasksController {
    private readonly tasks;
    constructor(tasks: TasksService);
    list(eventId: string, departmentId: string, user: any, cursor?: string, take?: string): Promise<{
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
    create(eventId: string, departmentId: string, user: any, dto: CreateTaskDto): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        priority: number;
        assigneeId: string | null;
        status: import("@prisma/client").$Enums.TaskStatus;
    }>;
    get(eventId: string, departmentId: string, taskId: string, user: any): Promise<{
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
    update(eventId: string, departmentId: string, taskId: string, user: any, dto: UpdateTaskDto): Promise<{
        id: string;
        title: string;
        priority: number;
        assigneeId: string | null;
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
    addDep(eventId: string, departmentId: string, taskId: string, user: any, dto: AddDependencyDto): Promise<{
        ok: boolean;
    }>;
    removeDep(eventId: string, departmentId: string, taskId: string, user: any, dto: RemoveDependencyDto): Promise<{
        ok: boolean;
    }>;
}
