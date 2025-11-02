import { EventRole, Task, Issue } from '@prisma/client';
export declare const ADMIN_ROLES: Set<import("@prisma/client").$Enums.EventRole>;
export declare const DEPT_ROLES: Set<import("@prisma/client").$Enums.EventRole>;
export declare function canManageInDept(role: EventRole): boolean;
export declare function canCreateInDept(role: EventRole): boolean;
export declare function canUpdateTask(role: EventRole, task: Task, actorId: string, sameDept: boolean): boolean;
export declare function canDeleteTask(role: EventRole, task: Task, actorId: string, sameDept: boolean): boolean;
export declare function canUpdateIssue(role: EventRole, issue: Issue, actorId: string, sameDept: boolean): boolean;
export declare function canDeleteIssue(role: EventRole, issue: Issue, actorId: string, sameDept: boolean): boolean;
