import { EventRole, Task } from '@prisma/client';
export declare const ADMIN_ROLES: Set<import("@prisma/client").$Enums.EventRole>;
export declare const DEPT_ROLES: Set<import("@prisma/client").$Enums.EventRole>;
export declare function canManageInDept(role: EventRole): boolean;
export declare function canCreateInDept(role: EventRole): boolean;
export declare function canUpdateTask(role: EventRole, task: Task, actorId: string, sameDept: boolean): boolean;
export declare function canDeleteTask(role: EventRole, task: Task, actorId: string, sameDept: boolean): boolean;
