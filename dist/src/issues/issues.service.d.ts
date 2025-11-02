import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { ChangeIssueStatusDto } from './dto/change-issue-status.dto';
type Actor = {
    userId: string;
    isSuperAdmin: boolean;
};
export declare class IssuesService {
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
        status: import("@prisma/client").$Enums.IssueStatus;
        updatedAt: Date;
        reporterId: string;
        severity: import("@prisma/client").$Enums.IssueSeverity;
        closedAt: Date | null;
    }[]>;
    create(eventId: string, departmentId: string, actor: Actor, dto: CreateIssueDto): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        status: import("@prisma/client").$Enums.IssueStatus;
        severity: import("@prisma/client").$Enums.IssueSeverity;
    }>;
    get(eventId: string, departmentId: string, issueId: string, actor: Actor): Promise<{
        id: string;
        createdAt: Date;
        departmentId: string | null;
        eventId: string;
        title: string;
        description: string | null;
        status: import("@prisma/client").$Enums.IssueStatus;
        updatedAt: Date;
        deletedAt: Date | null;
        reporterId: string;
        severity: import("@prisma/client").$Enums.IssueSeverity;
        closedAt: Date | null;
    }>;
    update(eventId: string, departmentId: string, issueId: string, actor: Actor, dto: UpdateIssueDto): Promise<{
        id: string;
        title: string;
        status: import("@prisma/client").$Enums.IssueStatus;
        updatedAt: Date;
        severity: import("@prisma/client").$Enums.IssueSeverity;
    }>;
    changeStatus(eventId: string, departmentId: string, issueId: string, actor: Actor, dto: ChangeIssueStatusDto): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.IssueStatus;
        updatedAt: Date;
        closedAt: Date | null;
    }>;
    remove(eventId: string, departmentId: string, issueId: string, actor: Actor): Promise<{
        ok: boolean;
    }>;
}
export {};
