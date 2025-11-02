import { EventRole, Task, Issue } from '@prisma/client';

export const ADMIN_ROLES = new Set<EventRole>([EventRole.OWNER, EventRole.PMO_ADMIN]);
export const DEPT_ROLES  = new Set<EventRole>([EventRole.DEPT_HEAD, EventRole.DEPT_MEMBER, EventRole.OBSERVER]);

export function canManageInDept(role: EventRole) {
  return role === EventRole.DEPT_HEAD || ADMIN_ROLES.has(role);
}

export function canCreateInDept(role: EventRole) {
  return role === EventRole.DEPT_HEAD || role === EventRole.DEPT_MEMBER || ADMIN_ROLES.has(role);
}

export function canUpdateTask(role: EventRole, task: Task, actorId: string, sameDept: boolean) {
  if (ADMIN_ROLES.has(role)) return true;
  if (role === EventRole.DEPT_HEAD && sameDept) return true;
  if (role === EventRole.DEPT_MEMBER && sameDept) {
    // members can edit tasks they created or are assigned to
    return task.creatorId === actorId || task.assigneeId === actorId;
  }
  return false;
}

export function canDeleteTask(role: EventRole, task: Task, actorId: string, sameDept: boolean) {
  if (ADMIN_ROLES.has(role)) return true;
  if (role === EventRole.DEPT_HEAD && sameDept) return true;
  // members cannot delete others' tasks
  if (role === EventRole.DEPT_MEMBER && sameDept) return task.creatorId === actorId;
  return false;
}

export function canUpdateIssue(role: EventRole, issue: Issue, actorId: string, sameDept: boolean) {
  if (ADMIN_ROLES.has(role)) return true;
  if (role === EventRole.DEPT_HEAD && sameDept) return true;
  if (role === EventRole.DEPT_MEMBER && sameDept) return issue.reporterId === actorId;
  return false;
}

export function canDeleteIssue(role: EventRole, issue: Issue, actorId: string, sameDept: boolean) {
  if (ADMIN_ROLES.has(role)) return true;
  if (role === EventRole.DEPT_HEAD && sameDept) return true;
  if (role === EventRole.DEPT_MEMBER && sameDept) return issue.reporterId === actorId;
  return false;
}
